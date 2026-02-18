
import { Router, Request, Response } from "express";
import { authenticateToken, requireAdmin } from "./auth";
import { db } from "../services/db";

const router = Router();

// GET /api/notices (Public/Authenticated)
// Users see active notices, Admin sees all
// GET /api/notices (Public/Authenticated)
// Users see active notices, Admin sees all
router.get("/", authenticateToken, (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const { documentId } = req.query;
        let notices = db.getNotices();

        if (user.role !== "admin") {
            notices = notices.filter(n => n.isActive);
        }

        if (documentId) {
            notices = notices.filter(n => n.relatedDocumentId === documentId);
        }

        // Sort: Urgent/Exception first, then by date
        notices.sort((a, b) => {
            const priority = { exception: 3, urgent: 2, general: 1 };
            if (priority[a.category] !== priority[b.category]) {
                return priority[b.category] - priority[a.category];
            }
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        res.json(notices);
    } catch (error) {
        console.error("공지 조회 실패:", error);
        res.status(500).json({ error: "공지사항을 불러올 수 없습니다." });
    }
});

// POST /api/notices (Admin only)
router.post("/", authenticateToken, requireAdmin, (req: Request, res: Response) => {
    try {
        const { content, category, isActive, relatedDocumentId } = req.body;
        if (!content) {
            res.status(400).json({ error: "공지 내용은 필수입니다." });
            return;
        }

        const newNotice = db.addNotice({
            content,
            category: category || "general",
            isActive: isActive !== false,
            relatedDocumentId
        });

        res.status(201).json(newNotice);
    } catch (error) {
        console.error("공지 생성 실패:", error);
        res.status(500).json({ error: "공지사항을 등록할 수 없습니다." });
    }
});

// PATCH /api/notices/:id (Admin only)
router.patch("/:id", authenticateToken, requireAdmin, (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        const updates = req.body;

        const updated = db.updateNotice(id, updates);
        if (!updated) {
            res.status(404).json({ error: "공지사항을 찾을 수 없습니다." });
            return;
        }

        res.json(updated);
    } catch (error) {
        console.error("공지 수정 실패:", error);
        res.status(500).json({ error: "공지사항을 수정할 수 없습니다." });
    }
});

export default router;
