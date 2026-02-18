import { Router, Request, Response } from "express";
import { authenticateToken, requireAdmin } from "./auth";
import { getDb, isFirebaseConfigured } from "../firebase";
import { generateAIDraft, generateInstantAnswer, findSimilarFaq } from "../services/ai";
import type { Question, QuestionStatus, OfficialDocument, FaqItem } from "../types";

const router = Router();

// ── Mock data ──
const mockDocuments: OfficialDocument[] = [
  {
    id: "doc1",
    title: "2026년 노인돌봄서비스 사업안내",
    documentNumber: "경남복지-2026-001",
    content:
      "2026년 노인돌봄서비스 사업안내입니다. 주요 변경사항: 1) 서비스 대상자 확대 - 기존 65세 이상에서 60세 이상으로 확대. 2) 서비스 단가 인상 - 시간당 15,000원에서 17,000원으로 조정. 3) 종사자 처우개선 - 월 기본급 5% 인상. 4) 신규 프로그램 도입 - AI 기반 건강모니터링 서비스 시범 운영.",
    fileUrl: "",
    uploadedAt: null as any,
    uploadedBy: "admin",
  },
  {
    id: "doc2",
    title: "긴급복지지원 업무처리 지침 개정",
    documentNumber: "경남복지-2026-015",
    content:
      "긴급복지지원 업무처리 지침 개정사항을 안내합니다. 1) 위기사유 판단기준 완화 - 소득기준 중위소득 75%에서 85%로 상향. 2) 지원기간 연장 - 최대 6개월에서 9개월로 연장 가능. 3) 현물지원 품목 확대. 4) 긴급복지 핫라인 24시간 운영 의무화.",
    fileUrl: "",
    uploadedAt: null as any,
    uploadedBy: "admin",
  },
];

let mockQuestions: Question[] = [
  {
    id: "q1",
    title: "노인돌봄서비스 대상자 확대 기준 문의",
    content:
      "2026년 사업안내에서 서비스 대상자가 60세 이상으로 확대된다고 되어있는데, 기존 65세 이상 이용자와 신규 60-64세 이용자의 서비스 내용에 차이가 있나요?",
    category: "사업지침",
    relatedDocumentId: "doc1",
    authorName: "김사회",
    authorOrg: "ORG001",
    authorOrgName: "창원시 종합사회복지관",
    status: "ai_draft",
    aiDraftAnswer:
      "2026년 노인돌봄서비스 사업안내에 따르면, 서비스 대상자가 60세 이상으로 확대되었습니다.\n\n**기존 65세 이상 이용자**와 **신규 60-64세 이용자**의 서비스 내용은 기본적으로 동일합니다. 다만, 신규 대상자(60-64세)의 경우:\n\n1. **서비스 시간**: 주 최대 9시간 (기존 대상자는 주 12시간)\n2. **우선순위**: 기존 이용자 서비스 유지가 우선이며, 신규 대상자는 잔여 예산 범위 내에서 지원\n3. **건강모니터링**: AI 기반 건강모니터링 서비스가 시범적으로 적용됩니다\n\n자세한 사항은 사업안내서 제3장 '서비스 대상자 선정기준'을 참고해주세요.",
    createdAt: null as any,
    isPublic: true,
  },
  {
    id: "q2",
    title: "긴급복지지원 소득기준 변경 적용 시기",
    content:
      "긴급복지지원 소득기준이 중위소득 85%로 상향된다고 하는데, 언제부터 적용되나요? 현재 접수 중인 건에도 소급 적용이 가능한가요?",
    category: "행정절차",
    relatedDocumentId: "doc2",
    authorName: "박복지",
    authorOrg: "ORG002",
    authorOrgName: "김해시 사회복지협의회",
    status: "pending",
    createdAt: null as any,
    isPublic: true,
  },
];

let mockIdCounter = 10;

// ── Helpers ──

async function fetchQuestions(filters?: {
  status?: QuestionStatus;
}): Promise<Question[]> {
  if (!isFirebaseConfigured()) {
    let result = [...mockQuestions];
    if (filters?.status) {
      result = result.filter((q) => q.status === filters.status);
    }
    return result;
  }

  const db = getDb();
  let ref: FirebaseFirestore.Query = db
    .collection("questions")
    .orderBy("createdAt", "desc");
  if (filters?.status) {
    ref = ref.where("status", "==", filters.status);
  }
  const snapshot = await ref.get();
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Question);
}

async function fetchQuestion(id: string): Promise<Question | null> {
  if (!isFirebaseConfigured()) {
    return mockQuestions.find((q) => q.id === id) ?? null;
  }
  const doc = await getDb().collection("questions").doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Question;
}

async function fetchDocument(id: string): Promise<OfficialDocument | null> {
  if (!isFirebaseConfigured()) {
    return mockDocuments.find((d) => d.id === id) ?? null;
  }
  const doc = await getDb().collection("documents").doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as OfficialDocument;
}

// GET /api/questions
router.get("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const status = (Array.isArray(req.query.status) ? req.query.status[0] : req.query.status) as QuestionStatus | undefined;
    const search = (Array.isArray(req.query.search) ? req.query.search[0] : req.query.search) as string | undefined;
    const user = (req as any).user;

    let questions = await fetchQuestions(
      status ? { status } : undefined
    );

    // Non-admin users only see public + own questions
    if (user.role !== "admin") {
      questions = questions.filter(
        (q) => q.isPublic || q.authorOrg === user.orgCode
      );
    }

    // Search filter
    if (search) {
      const query = search.toLowerCase();
      questions = questions.filter(
        (q) =>
          q.title.toLowerCase().includes(query) ||
          q.content.toLowerCase().includes(query) ||
          q.authorOrgName.toLowerCase().includes(query)
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
  try {
    const question = await fetchQuestion(req.params.id as string);
    if (!question) {
      res.status(404).json({ error: "질문을 찾을 수 없습니다." });
      return;
    }
    res.json(question);
  } catch (err) {
    console.error("질문 조회 실패:", err);
    res.status(500).json({ error: "질문을 불러올 수 없습니다." });
  }
});

// POST /api/questions/instant-query
router.post(
  "/instant-query",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { question, documentId } = req.body;

      if (!question || !documentId) {
        res
          .status(400)
          .json({ error: "질문과 공문을 선택해주세요." });
        return;
      }

      // 1. Fetch the document
      const doc = await fetchDocument(documentId);
      if (!doc) {
        res.status(404).json({ error: "공문을 찾을 수 없습니다." });
        return;
      }

      // 1.5 Check validity period
      if (doc.validUntil) {
        const expiry = new Date(doc.validUntil);
        if (expiry < new Date()) {
          res.status(400).json({
            error: "해당 공문의 질의응답 기간이 종료되었습니다.",
          });
          return;
        }
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
      const approvedFaqs = (doc.faqItems || []).filter(
        (f: FaqItem) => f.status === "승인"
      );
      const answer = await generateInstantAnswer(
        question,
        doc,
        approvedFaqs.map((f: FaqItem) => ({
          question: f.question,
          answer: f.answer,
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
  }
);

// POST /api/questions
router.post("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      title,
      content,
      category,
      relatedDocumentId,
      authorName,
      authorOrg,
      authorOrgName,
      isPublic,
    } = req.body;

    if (!title || !content || !category) {
      res.status(400).json({ error: "제목, 내용, 카테고리는 필수입니다." });
      return;
    }

    let id: string;
    const questionData = {
      title,
      content,
      category,
      relatedDocumentId: relatedDocumentId || null,
      authorName,
      authorOrg,
      authorOrgName,
      status: "pending" as QuestionStatus,
      isPublic: isPublic !== false,
      createdAt: isFirebaseConfigured()
        ? require("firebase-admin").firestore.FieldValue.serverTimestamp()
        : null,
    };

    if (!isFirebaseConfigured()) {
      id = `q${++mockIdCounter}`;
      mockQuestions.unshift({ ...questionData, id } as any);
    } else {
      const docRef = await getDb().collection("questions").add(questionData);
      id = docRef.id;
    }

    // Async AI draft generation
    const question = await fetchQuestion(id);
    if (question) {
      (async () => {
        try {
          const relatedDoc = question.relatedDocumentId
            ? await fetchDocument(question.relatedDocumentId)
            : null;
          const allQuestions = await fetchQuestions();
          const similarQAs = allQuestions.filter(
            (q) =>
              q.id !== question.id &&
              (q.status === "answered" || q.status === "closed") &&
              (q.category === question.category ||
                q.relatedDocumentId === question.relatedDocumentId)
          );

          const draft = await generateAIDraft(question, relatedDoc, similarQAs);

          if (!isFirebaseConfigured()) {
            mockQuestions = mockQuestions.map((q) =>
              q.id === id
                ? { ...q, aiDraftAnswer: draft, status: "ai_draft" as QuestionStatus }
                : q
            );
          } else {
            await getDb().collection("questions").doc(id).update({
              aiDraftAnswer: draft,
              status: "ai_draft",
            });
          }
          console.log(`AI 초안 생성 완료: ${id}`);
        } catch (err) {
          console.error(`AI 초안 생성 실패 (${id}):`, err);
          const errorMsg = `AI 초안 생성 중 오류가 발생했습니다: ${err instanceof Error ? err.message : "알 수 없는 오류"}`;
          if (!isFirebaseConfigured()) {
            mockQuestions = mockQuestions.map((q) =>
              q.id === id
                ? { ...q, aiDraftAnswer: errorMsg, status: "ai_draft" as QuestionStatus }
                : q
            );
          } else {
            await getDb().collection("questions").doc(id).update({
              aiDraftAnswer: errorMsg,
              status: "ai_draft",
            });
          }
        }
      })();
    }

    res.status(201).json({ id });
  } catch (err) {
    console.error("질문 생성 실패:", err);
    res.status(500).json({ error: "질문을 등록할 수 없습니다." });
  }
});

// PATCH /api/questions/:id
router.patch(
  "/:id",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const updates = req.body;

      if (!isFirebaseConfigured()) {
        const idx = mockQuestions.findIndex((q) => q.id === id);
        if (idx === -1) {
          res.status(404).json({ error: "질문을 찾을 수 없습니다." });
          return;
        }
        mockQuestions[idx] = { ...mockQuestions[idx], ...updates };
      } else {
        await getDb().collection("questions").doc(id).update(updates);
      }

      res.json({ success: true });
    } catch (err) {
      console.error("질문 수정 실패:", err);
      res.status(500).json({ error: "질문을 수정할 수 없습니다." });
    }
  }
);

// DELETE /api/questions/:id
router.delete(
  "/:id",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;

      if (!isFirebaseConfigured()) {
        mockQuestions = mockQuestions.filter((q) => q.id !== id);
      } else {
        await getDb().collection("questions").doc(id).delete();
      }

      res.json({ success: true });
    } catch (err) {
      console.error("질문 삭제 실패:", err);
      res.status(500).json({ error: "질문을 삭제할 수 없습니다." });
    }
  }
);

export default router;
