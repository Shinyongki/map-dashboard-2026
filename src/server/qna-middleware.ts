import { Router as ExpressRouter, Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";
import express from "express";
import jwt from "jsonwebtoken";
import multer from "multer";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getOrganizationByCode } from "../lib/organization-data";

// ─── Types ───────────────────────────────────────────────────
interface JwtPayload {
    orgCode: string;
    name: string;
    orgName: string;
    role: "user" | "admin";
    region: string;
    isHub: boolean;
}

interface MockQuestion {
    id: string;
    title: string;
    content: string;
    category: string;
    relatedDocumentId?: string;
    authorName: string;
    authorOrg: string;
    authorOrgName: string;
    status: string;
    aiDraftAnswer?: string;
    finalAnswer?: string;
    answeredBy?: string;
    answeredAt?: string;
    createdAt: string;
    isPublic: boolean;
}

interface MockDocument {
    id: string;
    title: string;
    documentNumber: string;
    content: string;
    fileUrl: string;
    uploadedAt: string;
    uploadedBy: string;
    managerName?: string;
    managerPhone?: string;
    validUntil?: string;
}

// ─── Config ──────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || "qna-system-secret-2026";
const ADMIN_CODE = process.env.ADMIN_CODE || "1672";

// ─── Mock Data ───────────────────────────────────────────────
let mockQuestions: MockQuestion[] = [
    {
        id: "q1",
        title: "노인맞춤돌봄서비스 사업지침 변경사항 문의",
        content:
            "2026년 노인맞춤돌봄서비스 사업지침에서 변경된 주요 내용이 무엇인지 알고 싶습니다. 특히 생활지원사 배치 기준과 이용자 선정 기준의 변경 사항을 알려주세요.",
        category: "사업지침",
        authorName: "김복지",
        authorOrg: "ORG001",
        authorOrgName: "창원시 종합사회복지관",
        status: "answered",
        aiDraftAnswer:
            "2026년 노인맞춤돌봄서비스 사업지침의 주요 변경사항은 다음과 같습니다:\n\n1. 생활지원사 배치 기준: 이용자 대비 생활지원사 비율이 조정되었습니다.\n2. 이용자 선정 기준: 독거노인 우선 선정 기준이 강화되었습니다.\n3. 서비스 제공 시간: 주당 최대 서비스 시간이 확대되었습니다.",
        finalAnswer:
            "2026년 노인맞춤돌봄서비스 사업지침의 주요 변경사항을 안내드립니다.\n\n1. 생활지원사 배치 기준 변경: 이용자 25명당 1명에서 20명당 1명으로 조정\n2. 이용자 선정 기준 강화: 차상위 독거노인 우선 선정\n3. 서비스 시간 확대: 주 6시간에서 주 8시간으로 확대\n4. 긴급안전안심서비스 확대: ICT 기반 모니터링 강화\n\n자세한 사항은 공문 제2026-042호를 참고해주세요.",
        answeredBy: "관리자",
        answeredAt: new Date().toISOString(),
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        isPublic: true,
    },
    {
        id: "q2",
        title: "프로그램 운영 보고서 작성 양식 문의",
        content:
            "분기별 프로그램 운영 보고서 작성 시 필수 포함 항목이 무엇인지 알려주세요. 이전 양식과 변경된 부분이 있는지도 확인 부탁드립니다.",
        category: "서식작성",
        authorName: "이민수",
        authorOrg: "ORG002",
        authorOrgName: "김해시 노인복지센터",
        status: "ai_draft",
        aiDraftAnswer:
            "분기별 프로그램 운영 보고서의 필수 포함 항목은 다음과 같습니다:\n\n1. 프로그램명 및 운영 기간\n2. 참여 인원 (신규/기존)\n3. 프로그램 내용 요약\n4. 성과 지표 및 달성률\n5. 예산 집행 현황\n6. 향후 운영 계획\n\n2026년부터 변경된 점: 성과 지표에 이용자 만족도 조사 결과를 반드시 포함해야 합니다.",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        isPublic: true,
    },
    {
        id: "q3",
        title: "긴급돌봄 서비스 신청 절차 안내 요청",
        content:
            "긴급돌봄 서비스를 신청하려면 어떤 절차를 거쳐야 하나요? 필요한 서류와 처리 기간을 알려주세요.",
        category: "행정절차",
        authorName: "박서연",
        authorOrg: "ORG003",
        authorOrgName: "진주시 노인돌봄센터",
        status: "pending",
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        isPublic: true,
    },
];

let mockDocuments: MockDocument[] = [
    {
        id: "doc1",
        title: "2026년 노인맞춤돌봄서비스 사업안내",
        documentNumber: "경남복지-2026-042",
        content:
            "2026년 노인맞춤돌봄서비스 사업안내 지침입니다. 주요 내용으로는 서비스 대상자 선정 기준, 서비스 제공 절차, 생활지원사 관리 등이 포함되어 있습니다.",
        fileUrl: "",
        uploadedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
        uploadedBy: "관리자",
        managerName: "김지방",
        managerPhone: "051-123-4567",
    },
    {
        id: "doc2",
        title: "분기별 보고서 작성 가이드라인",
        documentNumber: "경남복지-2026-038",
        content:
            "분기별 실적 보고서 작성을 위한 가이드라인입니다. 보고서 양식, 필수 항목, 제출 기한 등에 대한 안내가 포함되어 있습니다.",
        fileUrl: "",
        uploadedAt: new Date(Date.now() - 86400000 * 14).toISOString(),
        uploadedBy: "관리자",
        managerName: "이복지",
        managerPhone: "051-765-4321",
    },
];

let nextQuestionId = 4;
let nextDocumentId = 3;

// ─── AI Service (Integrated) ──────────────────────────────
async function generateAIDraft(title: string, content: string): Promise<string> {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
        return `[AI 자동 생성 초안 (가상)]\n\n"${title}"에 대한 답변입니다.\n\n관련 사업지침 및 규정을 검토한 결과, 다음과 같이 안내드립니다:\n\n1. ${content.slice(0, 50)}에 대해서는 해당 사업지침을 참고해주시기 바랍니다.\n2. 추가적인 문의사항이 있으시면 담당자에게 연락 부탁드립니다.\n\n※ 이 답변은 AI가 자동 생성한 초안이며, 관리자 검토 후 최종 답변이 전달됩니다.`;
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            systemInstruction: "당신은 경상남도 광역지원기관의 공문 Q&A 담당 AI 어시스턴트입니다. 사회복지사들의 질문에 대해 정확하고 친절한 답변 초안을 작성합니다. 답변은 마크다운 형식으로 작성하세요."
        });

        const prompt = `질문 제목: ${title}\n질문 내용: ${content}\n\n위 질문에 대한 답변 초안을 작성해주세요.`;
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (err) {
        console.error("Middleware AI Error:", err);
        return "AI 답변 생성 중 오류가 발생했습니다.";
    }
}

// ─── Auth Middleware ─────────────────────────────────────────
function authenticateToken(req: ExpressRequest, res: ExpressResponse, next: NextFunction): void {
    const authHeader = (req as any).headers?.authorization;
    const token = typeof authHeader === 'string' ? authHeader.split(" ")[1] : null;
    if (!token) {
        (res as any).status(401).json({ error: "인증이 필요합니다." });
        return;
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
        (req as any).user = decoded;
        next();
    } catch {
        (res as any).status(403).json({ error: "유효하지 않은 토큰입니다." });
    }
}

// ─── Create Router ───────────────────────────────────────────
export function createQnARouter(): ExpressRouter {
    const router = express.Router();
    const upload = multer({ storage: multer.memoryStorage() });

    // ── Auth ──
    router.post("/auth/login", (req: ExpressRequest, res: ExpressResponse) => {
        const { code, name } = (req as any).body || {};
        if (!code || !name) {
            res.status(400).json({ error: "기관코드와 이름을 입력해주세요." });
            return;
        }

        let payload: JwtPayload;

        if (code === ADMIN_CODE) {
            // 관리자 로그인
            payload = {
                orgCode: code,
                name,
                orgName: "광역지원기관",
                role: "admin",
                region: "전체",
                isHub: false,
            };
        } else {
            // 기관코드 검증
            const org = getOrganizationByCode(code);
            if (!org) {
                res.status(401).json({ error: "유효하지 않은 기관코드입니다." });
                return;
            }
            payload = {
                orgCode: code,
                name,
                orgName: org.기관명,
                role: "user",
                region: org.시군,
                isHub: org.거점여부,
            };
        }

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
        res.json({ token, user: payload });
    });

    // ── Questions ──
    router.get("/questions", authenticateToken, (req: ExpressRequest, res: ExpressResponse) => {
        const { status, search } = (req as any).query || {};
        let result = [...mockQuestions];
        if (status && status !== "all") {
            result = result.filter((q) => q.status === status);
        }
        if (search) {
            const s = (search as string).toLowerCase();
            result = result.filter(
                (q) =>
                    q.title.toLowerCase().includes(s) ||
                    q.content.toLowerCase().includes(s) ||
                    q.authorOrgName.toLowerCase().includes(s)
            );
        }
        res.json(result);
    });

    router.get("/questions/:id", authenticateToken, (req: ExpressRequest, res: ExpressResponse) => {
        const q = mockQuestions.find((q) => q.id === (req as any).params?.id);
        if (!q) {
            res.status(404).json({ error: "질문을 찾을 수 없습니다." });
            return;
        }
        res.json(q);
    });

    router.post("/questions", authenticateToken, (req: ExpressRequest, res: ExpressResponse) => {
        const { title, content, category, relatedDocumentId, authorName, authorOrg, authorOrgName, isPublic } = (req as any).body || {};
        const id = `q${nextQuestionId++}`;
        const newQuestion: MockQuestion = {
            id,
            title,
            content,
            category,
            relatedDocumentId,
            authorName,
            authorOrg,
            authorOrgName,
            status: "pending",
            createdAt: new Date().toISOString(),
            isPublic: isPublic ?? true,
        };
        mockQuestions.unshift(newQuestion);

        // Generate AI draft
        generateAIDraft(title, content).then(draft => {
            const q = mockQuestions.find((q) => q.id === id);
            if (q && q.status === "pending") {
                q.status = "ai_draft";
                q.aiDraftAnswer = draft;
            }
        });

        res.json({ id });
    });

    router.patch("/questions/:id", authenticateToken, (req: ExpressRequest, res: ExpressResponse) => {
        const q = mockQuestions.find((q) => q.id === (req as any).params?.id);
        if (!q) {
            res.status(404).json({ error: "질문을 찾을 수 없습니다." });
            return;
        }
        Object.assign(q, (req as any).body || {});
        if ((req as any).body?.status === "answered") {
            q.answeredAt = new Date().toISOString();
        }
        res.json(q);
    });

    router.delete("/questions/:id", authenticateToken, (req: ExpressRequest, res: ExpressResponse) => {
        const idx = mockQuestions.findIndex((q) => q.id === (req as any).params?.id);
        if (idx === -1) {
            res.status(404).json({ error: "질문을 찾을 수 없습니다." });
            return;
        }
        mockQuestions.splice(idx, 1);
        res.json({ success: true });
    });

    // ── Documents ──
    router.get("/documents", authenticateToken, (_req: ExpressRequest, res: ExpressResponse) => {
        res.json(mockDocuments);
    });

    router.post("/documents", authenticateToken, upload.single("file"), (req: ExpressRequest, res: ExpressResponse) => {
        const { title, documentNumber, content, managerName, managerPhone } = (req as any).body || {};
        const id = `doc${nextDocumentId++}`;
        const newDoc: MockDocument = {
            id,
            title,
            documentNumber,
            content: content || "(업로드된 파일)",
            fileUrl: "",
            uploadedAt: new Date().toISOString(),
            uploadedBy: (req as any).user?.name || "unknown",
            managerName,
            managerPhone,
        };
        mockDocuments.unshift(newDoc);
        res.json({ id });
    });

    router.patch("/documents/:id", authenticateToken, (req: ExpressRequest, res: ExpressResponse) => {
        const doc = mockDocuments.find((d) => d.id === (req as any).params?.id);
        if (!doc) {
            res.status(404).json({ error: "문서를 찾을 수 없습니다." });
            return;
        }
        const { title, documentNumber, managerName, managerPhone } = (req as any).body || {};
        if (title) doc.title = title;
        if (documentNumber) doc.documentNumber = documentNumber;
        if (managerName !== undefined) doc.managerName = managerName;
        if (managerPhone !== undefined) doc.managerPhone = managerPhone;

        res.json(doc);
    });

    router.patch("/documents/:id/valid-until", authenticateToken, (req: ExpressRequest, res: ExpressResponse) => {
        const doc = mockDocuments.find((d) => d.id === (req as any).params?.id);
        if (!doc) {
            res.status(404).json({ error: "문서를 찾을 수 없습니다." });
            return;
        }
        doc.validUntil = (req as any).body?.validUntil;
        res.json(doc);
    });

    router.delete("/documents/:id", authenticateToken, (req: ExpressRequest, res: ExpressResponse) => {
        const idx = mockDocuments.findIndex((d) => d.id === (req as any).params?.id);
        if (idx === -1) {
            res.status(404).json({ error: "문서를 찾을 수 없습니다." });
            return;
        }
        mockDocuments.splice(idx, 1);
        res.json({ success: true });
    });

    // ── Health check ──
    router.get("/health", (_req: ExpressRequest, res: ExpressResponse) => {
        res.json({ status: "ok", mode: "integrated" });
    });

    return router;
}

// ─── Create full Express app ─────────────────────────────────
export function createQnAApp() {
    const app = express();
    app.use(express.json());
    app.use(createQnARouter());
    return app;
}
