import { Router, Request, Response } from "express";
import multer from "multer";
import { authenticateToken, requireAdmin } from "./auth";
import { getDb, getBucket, isFirebaseConfigured } from "../firebase";
import { extractTextFromPDF } from "../services/pdf";
import { generateDocumentSummary } from "../services/ai";
import type { OfficialDocument, FaqItem } from "../types";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// ── Mock data (shared with questions route for consistency) ──
let mockDocuments: OfficialDocument[] = [
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
let mockDocIdCounter = 10;

// GET /api/documents
router.get("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const activeOnly = req.query.activeOnly === "true";

    const filterActive = (docs: OfficialDocument[]) => {
      if (!activeOnly) return docs;
      const now = new Date();
      return docs.filter(
        (d) => !d.validUntil || new Date(d.validUntil) >= now
      );
    };

    if (!isFirebaseConfigured()) {
      res.json(filterActive(mockDocuments));
      return;
    }

    const snapshot = await getDb()
      .collection("documents")
      .orderBy("uploadedAt", "desc")
      .get();
    const docs = snapshot.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as OfficialDocument
    );
    res.json(filterActive(docs));
  } catch (err) {
    console.error("문서 목록 조회 실패:", err);
    res.status(500).json({ error: "문서 목록을 불러올 수 없습니다." });
  }
});

// POST /api/documents (multipart upload)
router.post(
  "/",
  authenticateToken,
  requireAdmin,
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      const { title, documentNumber, content: manualContent } = req.body;
      const file = req.file;

      if (!file || !title || !documentNumber) {
        res
          .status(400)
          .json({ error: "파일, 제목, 공문번호를 모두 입력해주세요." });
        return;
      }

      const user = (req as any).user;
      let content = manualContent || "";

      // Extract text from PDF if no manual content
      if (!content && file.mimetype === "application/pdf") {
        content = await extractTextFromPDF(file.buffer);
      }

      if (!isFirebaseConfigured()) {
        const id = `doc${++mockDocIdCounter}`;

        // Generate AI summary
        let summary = "";
        let targetType: OfficialDocument["targetType"] = "전체";
        let faqItems: FaqItem[] = [];

        try {
          const aiResult = await generateDocumentSummary(content);
          summary = aiResult.summary;
          targetType = aiResult.targetType;
          faqItems = aiResult.faqDrafts.map((faq, idx) => ({
            id: `${id}_faq${idx + 1}`,
            question: faq.question,
            answer: faq.answer,
            status: "대기" as const,
          }));
        } catch (err) {
          console.error("AI 요약 생성 실패:", err);
        }

        mockDocuments.push({
          id,
          title,
          documentNumber,
          content,
          fileUrl: "",
          uploadedAt: null as any,
          uploadedBy: user.name,
          summary,
          targetType,
          faqStatus: "대기",
          faqItems,
        });
        res.status(201).json({ id, summary, targetType, faqCount: faqItems.length });
        return;
      }

      // Upload file to Firebase Storage
      const bucket = getBucket();
      const fileName = `documents/${Date.now()}_${file.originalname}`;
      const fileRef = bucket.file(fileName);
      await fileRef.save(file.buffer, {
        metadata: { contentType: file.mimetype },
      });
      const [fileUrl] = await fileRef.getSignedUrl({
        action: "read",
        expires: "2030-01-01",
      });

      // Generate AI summary
      let summary = "";
      let targetType: OfficialDocument["targetType"] = "전체";
      let faqItems: FaqItem[] = [];

      try {
        const aiResult = await generateDocumentSummary(content);
        summary = aiResult.summary;
        targetType = aiResult.targetType;
        faqItems = aiResult.faqDrafts.map((faq, idx) => ({
          id: `${Date.now()}_faq${idx + 1}`,
          question: faq.question,
          answer: faq.answer,
          status: "대기" as const,
        }));
      } catch (err) {
        console.error("AI 요약 생성 실패:", err);
      }

      const docRef = await getDb().collection("documents").add({
        title,
        documentNumber,
        content,
        fileUrl,
        uploadedAt:
          require("firebase-admin").firestore.FieldValue.serverTimestamp(),
        uploadedBy: user.name,
        summary,
        targetType,
        faqStatus: "대기",
        faqItems,
      });

      res.status(201).json({ id: docRef.id, summary, targetType, faqCount: faqItems.length });
    } catch (err) {
      console.error("문서 업로드 실패:", err);
      res.status(500).json({ error: "문서를 업로드할 수 없습니다." });
    }
  }
);

// ── Validity Period ──

// PATCH /api/documents/:id/valid-until
router.patch(
  "/:id/valid-until",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const { validUntil } = req.body;

      if (!validUntil) {
        res.status(400).json({ error: "유효기간을 입력해주세요." });
        return;
      }

      if (!isFirebaseConfigured()) {
        const doc = mockDocuments.find((d) => d.id === id);
        if (!doc) {
          res.status(404).json({ error: "문서를 찾을 수 없습니다." });
          return;
        }
        doc.validUntil = validUntil;
        res.json({ success: true, validUntil });
        return;
      }

      const docRef = getDb().collection("documents").doc(id);
      const docSnap = await docRef.get();
      if (!docSnap.exists) {
        res.status(404).json({ error: "문서를 찾을 수 없습니다." });
        return;
      }
      await docRef.update({ validUntil });
      res.json({ success: true, validUntil });
    } catch (err) {
      console.error("유효기간 설정 실패:", err);
      res.status(500).json({ error: "유효기간 설정에 실패했습니다." });
    }
  }
);

// ── FAQ Approval ──

// PATCH /api/documents/:id/faq/:faqId/approve
router.patch(
  "/:id/faq/:faqId/approve",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { id, faqId } = req.params as { id: string; faqId: string };
      const user = (req as any).user;

      if (!isFirebaseConfigured()) {
        const doc = mockDocuments.find((d) => d.id === id);
        if (!doc) {
          res.status(404).json({ error: "문서를 찾을 수 없습니다." });
          return;
        }
        const faq = doc.faqItems?.find((f) => f.id === faqId);
        if (!faq) {
          res.status(404).json({ error: "FAQ 항목을 찾을 수 없습니다." });
          return;
        }
        faq.status = "승인";
        faq.approvedAt = new Date().toISOString();
        faq.approvedBy = user.name;
        res.json({ success: true, faq });
        return;
      }

      const docRef = getDb().collection("documents").doc(id);
      const docSnap = await docRef.get();
      if (!docSnap.exists) {
        res.status(404).json({ error: "문서를 찾을 수 없습니다." });
        return;
      }
      const data = docSnap.data() as OfficialDocument;
      const faqItems = data.faqItems || [];
      const faqIdx = faqItems.findIndex((f) => f.id === faqId);
      if (faqIdx === -1) {
        res.status(404).json({ error: "FAQ 항목을 찾을 수 없습니다." });
        return;
      }
      faqItems[faqIdx].status = "승인";
      faqItems[faqIdx].approvedAt = new Date().toISOString();
      faqItems[faqIdx].approvedBy = user.name;
      await docRef.update({ faqItems });
      res.json({ success: true, faq: faqItems[faqIdx] });
    } catch (err) {
      console.error("FAQ 승인 실패:", err);
      res.status(500).json({ error: "FAQ 승인 처리에 실패했습니다." });
    }
  }
);

// PATCH /api/documents/:id/faq-status
router.patch(
  "/:id/faq-status",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const { faqStatus } = req.body;

      if (!faqStatus || !["승인", "비공개"].includes(faqStatus)) {
        res.status(400).json({ error: "유효한 상태값을 입력해주세요. (승인 / 비공개)" });
        return;
      }

      if (!isFirebaseConfigured()) {
        const doc = mockDocuments.find((d) => d.id === id);
        if (!doc) {
          res.status(404).json({ error: "문서를 찾을 수 없습니다." });
          return;
        }
        doc.faqStatus = faqStatus;
        res.json({ success: true, faqStatus });
        return;
      }

      const docRef = getDb().collection("documents").doc(id);
      const docSnap = await docRef.get();
      if (!docSnap.exists) {
        res.status(404).json({ error: "문서를 찾을 수 없습니다." });
        return;
      }
      await docRef.update({ faqStatus });
      res.json({ success: true, faqStatus });
    } catch (err) {
      console.error("FAQ 상태 변경 실패:", err);
      res.status(500).json({ error: "FAQ 상태 변경에 실패했습니다." });
    }
  }
);

// DELETE /api/documents/:id
router.delete(
  "/:id",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;

      if (!isFirebaseConfigured()) {
        mockDocuments = mockDocuments.filter((d) => d.id !== id);
        res.json({ success: true });
        return;
      }

      const docSnap = await getDb().collection("documents").doc(id).get();
      if (docSnap.exists) {
        const data = docSnap.data() as OfficialDocument;
        if (data.fileUrl) {
          try {
            const bucket = getBucket();
            const fileName = data.fileUrl.split("/").pop()?.split("?")[0];
            if (fileName) {
              await bucket.file(`documents/${fileName}`).delete();
            }
          } catch {
            // file may not exist
          }
        }
      }
      await getDb().collection("documents").doc(id).delete();

      res.json({ success: true });
    } catch (err) {
      console.error("문서 삭제 실패:", err);
      res.status(500).json({ error: "문서를 삭제할 수 없습니다." });
    }
  }
);

export default router;
