import { Router, Request, Response } from "express";
import { authenticateToken, requireAdmin } from "./auth";
import { getDb, isFirebaseConfigured } from "../firebase";
import { generateAIDraft, generateInstantAnswer, findSimilarFaq } from "../services/ai";
import type { QuestionStatus, OfficialDocument, FaqItem, Question } from "../types";
import { v4 as uuidv4 } from "uuid";

const router = Router();

// ── Helpers ──

// Mock fetchDocument for now (since documents are not yet in DB or we use existing logic)
// In a real scenario, this should also be replaced by DB calls if documents are stored there.
// For now, we keep the previous mock implementation or existing firebase logic if any, 
// but since we are moving to local DB, we might need a db.documents later. 
// For this step, we will assume documents are still handled via file system or existing mock,
// BUT for the purpose of this refactor, we will focus on QUESTIONS.
// We will need to keep a small mock for documents or fetch from where they are.
// Let's import mockDocuments from a shared source or keep them here if they were local.
// A better approach is to rely on what was previously there for documents, 
// OR simpler: just mock the `fetchDocument` function to return null/mock for now 
// until we refactor documents to DB too (which is likely next).
const mockDocuments: OfficialDocument[] = [
  {
    id: "doc1",
    title: "2026년 노인돌봄서비스 사업안내",
    documentNumber: "경남복지-2026-001",
    content:
      "2026년 노인돌봄서비스 사업안내입니다. 주요 변경사항: 1) 서비스 대상자 확대 - 기존 65세 이상에서 60세 이상으로 확대. 2) 서비스 단가 인상 - 시간당 15,000원에서 17,000원으로 조정. 3) 종사자 처우개선 - 월 기본급 5% 인상. 4) 신규 프로그램 도입 - AI 기반 건강모니터링 서비스 시범 운영.",
    fileUrl: "",
    uploadedAt: new Date().toISOString() as any,
    uploadedBy: "admin",
  },
  {
    id: "doc2",
    title: "긴급복지지원 업무처리 지침 개정",
    documentNumber: "경남복지-2026-015",
    content:
      "긴급복지지원 업무처리 지침 개정사항을 안내합니다. 1) 위기사유 판단기준 완화 - 소득기준 중위소득 75%에서 85%로 상향. 2) 지원기간 연장 - 최대 6개월에서 9개월로 연장 가능. 3) 현물지원 품목 확대. 4) 긴급복지 핫라인 24시간 운영 의무화.",
    fileUrl: "",
    uploadedAt: new Date().toISOString() as any,
    uploadedBy: "admin",
  },
];

async function fetchDocument(id: string): Promise<OfficialDocument | null> {
  if (!isFirebaseConfigured()) return null;
  try {
    const docSnap = await getDb().collection("documents").doc(id).get();
    if (!docSnap.exists) return null;
    return { id: docSnap.id, ...docSnap.data() } as OfficialDocument;
  } catch {
    return null;
  }
}

// GET /api/questions
router.get("/", authenticateToken, async (req: Request, res: Response) => {
  if (!isFirebaseConfigured()) return res.json([]);

  try {
    const status = (req.query.status as string) || "all";
    const search = req.query.search as string;
    const user = (req as any).user;

    const db = getDb();
    let query: FirebaseFirestore.Query = db.collection("questions");

    // Order by createdAt desc (Index might be required in real Firebase)
    query = query.orderBy("createdAt", "desc");

    // Fetch questions
    const snapshot = await query.get();
    let questions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Question[];

    // In-memory filters (Firestore's combined queries usually require complex indexes)
    // 1. Status Filter
    if (status && status !== "all") {
      questions = questions.filter((q) => q.status === status);
    }

    // 2. Permission Filter
    if (user.role !== "admin") {
      questions = questions.filter(
        (q) => (q as any).isPublic !== false || q.authorOrg === user.orgCode
      );
    }

    // 3. Search Filter
    if (search) {
      const s = search.toLowerCase();
      questions = questions.filter(
        (q) =>
          q.title.toLowerCase().includes(s) ||
          q.content.toLowerCase().includes(s) ||
          q.authorOrgName.toLowerCase().includes(s)
      );
    }

    res.json(questions);
  } catch (err) {
    console.error("질문 목록 조회 실패:", err);
    res.status(500).json({ error: "질문 목록을 불러올 수 없습니다." });
  }
});

// GET /api/questions/:id
router.get("/:id", authenticateToken, async (req: Request, res: Response) => {
  if (!isFirebaseConfigured()) return res.status(503).json({ error: "DB 연동 필요" });

  try {
    const id = req.params.id as string;
    const docSnap = await getDb().collection("questions").doc(id).get();

    if (!docSnap.exists) {
      res.status(404).json({ error: "질문을 찾을 수 없습니다." });
      return;
    }
    res.json({ id: docSnap.id, ...docSnap.data() });
  } catch (err) {
    console.error("질문 조회 실패:", err);
    res.status(500).json({ error: "질문을 불러올 수 없습니다." });
  }
});

// POST /api/questions
router.post("/", authenticateToken, async (req: Request, res: Response) => {
  if (!isFirebaseConfigured()) return res.status(503).json({ error: "DB 연동 필요" });

  try {
    const { title, content, category, relatedDocumentId, authorName, authorOrg, authorOrgName, isPublic } = req.body;

    if (!title || !content || !category) {
      res.status(400).json({ error: "제목, 내용, 카테고리는 필수입니다." });
      return;
    }

    const db = getDb();
    const newQuestionData = {
      title,
      content,
      category,
      relatedDocumentId: relatedDocumentId || null,
      authorName,
      authorOrg,
      authorOrgName,
      status: "pending" as const,
      createdAt: new Date().toISOString(),
      isPublic: isPublic ?? true,
    };

    const docRef = await db.collection("questions").add(newQuestionData);
    const questionId = docRef.id;

    // AI Draft Generation (Trigger after response or keep async)
    (async () => {
      try {
        const relatedDoc = relatedDocumentId ? await fetchDocument(relatedDocumentId) : null;
        const currentQuestion = { id: questionId, ...newQuestionData };

        // Find similar questions for context
        const snapshot = await db.collection("questions")
          .where("category", "==", category)
          .where("status", "in", ["answered", "closed"])
          .limit(5)
          .get();
        const similarQAs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const draft = await generateAIDraft(currentQuestion as any, relatedDoc, similarQAs as any[]);
        await db.collection("questions").doc(questionId).update({
          aiDraftAnswer: draft,
          status: "ai_draft"
        });
      } catch (err) {
        console.error("AI Draft failure:", err);
      }
    })();

    res.status(201).json({ id: questionId });
  } catch (err) {
    console.error("질문 생성 실패:", err);
    res.status(500).json({ error: "질문을 등록할 수 없습니다." });
  }
});

// PATCH /api/questions/:id
router.patch("/:id", authenticateToken, async (req: Request, res: Response) => {
  if (!isFirebaseConfigured()) return res.status(503).json({ error: "DB 연동 필요" });

  try {
    const id = req.params.id as string;
    const updates = req.body;

    await getDb().collection("questions").doc(id).update(updates);
    res.json({ success: true });
  } catch (err) {
    console.error("질문 수정 실패:", err);
    res.status(500).json({ error: "질문을 수정할 수 없습니다." });
  }
});

// DELETE /api/questions/:id
router.delete("/:id", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  if (!isFirebaseConfigured()) return res.status(503).json({ error: "DB 연동 필요" });

  try {
    const id = req.params.id as string;
    await getDb().collection("questions").doc(id).delete();
    res.json({ success: true });
  } catch (err) {
    console.error("질문 삭제 실패:", err);
    res.status(500).json({ error: "질문을 삭제할 수 없습니다." });
  }
});

// POST /api/questions/instant-query
router.post("/instant-query", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { question, documentId } = req.body;

    if (!question || !documentId) {
      res.status(400).json({ error: "질문과 공문을 선택해주세요." });
      return;
    }

    // 1. Fetch the document
    const doc = await fetchDocument(documentId);
    if (!doc) {
      res.status(404).json({ error: "공문을 찾을 수 없습니다." });
      return;
    }

    // 2. Check approved FAQ cache using findSimilarFaq
    const matchedFaq = findSimilarFaq(question, doc.faqItems || []);

    if (matchedFaq) {
      res.json({
        answer: matchedFaq.answer,
        source: "cache",
        faqQuestion: matchedFaq.question,
        documentTitle: doc.title,
        documentNumber: doc.documentNumber,
      });
      return;
    }

    // 3. Cache miss → AI instant answer
    // Note: generateInstantAnswer expects FaqItem[] for third arg.
    const approvedFaqs = (doc.faqItems || []).filter((f: FaqItem) => f.status === "승인");

    const answer = await generateInstantAnswer(
      question,
      doc,
      approvedFaqs.map((f: FaqItem) => ({
        question: f.question,
        answer: f.answer
      }))
    );

    res.json({
      answer,
      source: "ai",
      documentTitle: doc.title,
      documentNumber: doc.documentNumber,
    });
  } catch (err) {
    console.error("즉시 질의 실패:", err);
    res.status(500).json({ error: "답변 생성에 실패했습니다." });
  }
});

export default router;
