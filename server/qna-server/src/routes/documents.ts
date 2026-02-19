import { Router, Request, Response } from "express";
import multer from "multer";
import { authenticateToken, requireAdmin } from "./auth";
import { getDb, getBucket, isFirebaseConfigured } from "../firebase";
import { extractTextFromPDF } from "../services/pdf";
import { generateDocumentSummary } from "../services/ai";
import type { OfficialDocument, FaqItem } from "../types";

const router = Router();
const COLLECTION_NAME = "documents";

// GET /api/documents
router.get("/", authenticateToken, async (req: Request, res: Response) => {
  if (!isFirebaseConfigured()) {
    // Return empty list if Firebase is not configured instead of dying
    console.warn("Firebase not configured, returning empty documents");
    return res.json([]);
  }

  try {
    const db = getDb();
    const snapshot = await db.collection(COLLECTION_NAME)
      .orderBy("uploadedAt", "desc")
      .get();

    const documents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(documents);
  } catch (error) {
    console.error("Error fetching documents:", error);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

const upload = multer({ storage: multer.memoryStorage() });

// POST /api/documents
router.post("/", authenticateToken, requireAdmin, upload.array("files"), async (req: Request, res: Response) => {
  if (!isFirebaseConfigured()) {
    return res.status(503).json({ error: "DB 연동 데이터가 없어 등록할 수 없습니다." });
  }

  try {
    const { title, documentNumber, managerName, managerPhone, content: manualContent } = req.body;
    const files = req.files as Express.Multer.File[];

    if (!title || !documentNumber) {
      return res.status(400).json({ error: "제목과 공문번호는 필수입니다." });
    }

    if (!files || files.length === 0) {
      return res.status(400).json({ error: "업로드할 파일이 없습니다." });
    }

    const results = [];
    const db = getDb();
    const bucket = getBucket();

    for (const file of files) {
      let fileUrl = "";
      let content = manualContent || "";

      // 1. Storage Upload
      const fileName = `${Date.now()}_${file.originalname}`;
      const fileRef = bucket.file(`documents/${fileName}`);

      await fileRef.save(file.buffer, {
        metadata: { contentType: file.mimetype },
      });

      const [url] = await fileRef.getSignedUrl({
        action: "read",
        expires: "03-01-2500",
      });
      fileUrl = url;

      // 2. Text Extraction (Only if manual content is not provided)
      if (!manualContent) {
        if (file.mimetype === "application/pdf") {
          try {
            content = await extractTextFromPDF(file.buffer);
          } catch (err) {
            console.warn("PDF extraction failed:", err);
          }
        } else if (
          file.mimetype === "text/plain" ||
          file.mimetype === "text/markdown" ||
          file.originalname.endsWith(".md") ||
          file.originalname.endsWith(".txt")
        ) {
          try {
            content = file.buffer.toString("utf-8");
          } catch (err) {
            console.warn("Text extraction failed:", err);
          }
        }
      }

      // 3. AI Summary Generation
      let aiSummary = "";
      if (content) {
        try {
          const summaryResult = await generateDocumentSummary(content);
          aiSummary = typeof summaryResult === "string" ? summaryResult : summaryResult.summary;
        } catch (err) {
          console.warn("AI Summary failed:", err);
        }
      }

      // If multiple files, append filename to title for distinction
      const finalTitle = files.length > 1 ? `${title} (${file.originalname})` : title;

      const newDoc = {
        title: finalTitle,
        documentNumber,
        content,
        aiSummary,
        fileUrl,
        uploadedAt: new Date().toISOString(),
        uploadedBy: (req as any).user?.name || "관리자",
        managerName: managerName || "",
        managerPhone: managerPhone || "",
        faqItems: [],
        faqStatus: "비공개" as const,
      };

      const docRef = await db.collection(COLLECTION_NAME).add(newDoc);
      results.push({ id: docRef.id, ...newDoc });
    }

    res.status(201).json({ success: true, count: results.length, documents: results });
  } catch (error) {
    console.error("Error adding documents:", error);
    res.status(500).json({ error: "Failed to create documents" });
  }
});

// ── Validity Period ──

// PATCH /api/documents/:id (General update)
router.patch("/:id", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  if (!isFirebaseConfigured()) return res.status(503).json({ error: "DB 연동 필요" });

  try {
    const db = getDb();
    const { title, documentNumber, managerName, managerPhone } = req.body;
    const updateData: any = {};
    if (title) updateData.title = title as string;
    if (documentNumber) updateData.documentNumber = documentNumber as string;
    if (managerName !== undefined) updateData.managerName = managerName;
    if (managerPhone !== undefined) updateData.managerPhone = managerPhone;

    const id = req.params.id as string;
    await db.collection(COLLECTION_NAME).doc(id).update(updateData);
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating document:", error);
    res.status(500).json({ error: "Failed to update document" });
  }
});

// PATCH /api/documents/:id/valid-until
router.patch("/:id/valid-until", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  if (!isFirebaseConfigured()) return res.status(503).json({ error: "DB 연동 필요" });

  try {
    const db = getDb();
    const { validUntil } = req.body;
    const id = req.params.id as string;
    await db.collection(COLLECTION_NAME).doc(id).update({ validUntil });
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating validity:", error);
    res.status(500).json({ error: "Failed to update validity" });
  }
});

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
        res.status(503).json({ error: "DB 연동 필요" });
        return;
      }

      const docRef = getDb().collection("documents").doc(id as string);
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
      const id = req.params.id as string;
      const { faqStatus } = req.body;

      if (!faqStatus || !["승인", "비공개"].includes(faqStatus)) {
        res.status(400).json({ error: "유효한 상태값을 입력해주세요. (승인 / 비공개)" });
        return;
      }

      if (!isFirebaseConfigured()) {
        res.status(503).json({ error: "DB 연동 필요" });
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
router.delete("/:id", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  if (!isFirebaseConfigured()) return res.status(503).json({ error: "DB 연동 필요" });

  try {
    const id = req.params.id as string;
    const db = getDb();
    const docSnap = await db.collection(COLLECTION_NAME).doc(id).get();

    if (docSnap.exists) {
      const data = docSnap.data() as OfficialDocument;
      if (data.fileUrl) {
        try {
          const bucket = getBucket();
          const fileName = data.fileUrl.split("/").pop()?.split("?")[0];
          if (fileName) {
            await bucket.file(`documents/${fileName}`).delete();
          }
        } catch (storageErr) {
          console.warn("Could not delete file from storage (already gone or wrong name):", storageErr);
        }
      }
      await db.collection(COLLECTION_NAME).doc(id).delete();
    }

    res.json({ success: true });
  } catch (err) {
    console.error("문서 삭제 실패:", err);
    res.status(500).json({ error: "문서를 삭제할 수 없습니다." });
  }
});

export default router;
