import { Router as ExpressRouter, Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";
import express from "express";
import jwt from "jsonwebtoken";
import multer from "multer";
import fs from "fs";
import path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getOrganizationByCode } from "../lib/organization-data";
import * as adminNS from "firebase-admin";
const admin: typeof adminNS = (adminNS as any).default ?? adminNS;

// ─── Firebase ────────────────────────────────────────────────
let firebaseInitialized = false;

function initFirebase(): void {
    if (firebaseInitialized) return;
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
        : undefined;

    if (projectId && clientEmail && privateKey) {
        try {
            if ((admin.apps || []).length === 0) {
                admin.initializeApp({
                    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
                    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
                });
            }
            console.log("[QnA] Firebase Admin SDK initialized");
        } catch (err) {
            console.warn("[QnA] Firebase init error:", err);
        }
    } else {
        console.warn("[QnA] Firebase not configured — knowledge uses memory only");
    }
    firebaseInitialized = true;
}

function isFirebaseReady(): boolean {
    return !!(admin && admin.apps && admin.apps.length > 0);
}

function getDb(): FirebaseFirestore.Firestore {
    return admin.firestore();
}

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

type KnowledgeCategory = "사업지침" | "행정절차" | "매뉴얼" | "규정" | "기타";

interface MockKnowledgeItem {
    id: string;
    title: string;
    category: KnowledgeCategory;
    content: string;
    source: string; // "직접입력" | 파일명
    createdAt: string;
    chunkCount: number;
}

interface MockNotice {
    id: string;
    content: string;
    isActive: boolean;
    category: "general" | "urgent" | "exception";
    relatedDocumentId?: string;
    createdAt: string;
    updatedAt: string;
}

// ─── Config ──────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || "qna-system-secret-2026";
const ADMIN_CODE = process.env.ADMIN_CODE || "1672";

// ─── Mock Data ───────────────────────────────────────────────
let mockQuestions: MockQuestion[] = [];
let mockDocuments: MockDocument[] = [];

let nextQuestionId = 4;
let nextDocumentId = 3;
let nextKnowledgeId = 1;
let nextNoticeId = 2;

let mockNotices: MockNotice[] = [
    {
        id: "notice1",
        content: "2026년도 노인맞춤돌봄서비스 사업안내 지침이 게시되었습니다.",
        isActive: true,
        category: "general",
        relatedDocumentId: "doc1",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    }
];

let mockKnowledgeItems: MockKnowledgeItem[] = [];
let knowledgeLoaded = false;

async function loadKnowledgeFromFirestore(): Promise<void> {
    if (knowledgeLoaded || !isFirebaseReady()) return;
    try {
        const snapshot = await getDb().collection("knowledge").orderBy("createdAt", "desc").get();
        mockKnowledgeItems = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                title: data.title || "",
                category: data.category || "기타",
                content: data.content || "",
                source: data.source || "직접입력",
                createdAt: data.createdAt || new Date().toISOString(),
                chunkCount: data.chunkCount || 1,
            } as MockKnowledgeItem;
        });
        nextKnowledgeId = mockKnowledgeItems.length + 1;
        knowledgeLoaded = true;
        console.log(`[QnA] Firestore에서 지식 ${mockKnowledgeItems.length}건 로드 완료`);
    } catch (err) {
        console.error("[QnA] Firestore 지식 로드 실패:", err);
    }
}

// ─── Persistence Helpers ─────────────────────────────────────
const DATA_QUESTION_FILE_PATH = path.join(process.cwd(), "server-questions-data.json");
const DATA_NOTICE_FILE_PATH = path.join(process.cwd(), "server-notices-data.json");
const DATA_FILE_PATH = path.join(process.cwd(), "server-knowledge-data.json");

function saveQuestionsToLocalFile() {
    try {
        fs.writeFileSync(DATA_QUESTION_FILE_PATH, JSON.stringify(mockQuestions, null, 2), "utf-8");
    } catch (err) {
        console.error("[QnA] 질문 데이터 로컬 저장 실패:", err);
    }
}

function loadQuestionsFromLocalFile() {
    try {
        if (fs.existsSync(DATA_QUESTION_FILE_PATH)) {
            const data = fs.readFileSync(DATA_QUESTION_FILE_PATH, "utf-8");
            const items = JSON.parse(data);
            if (Array.isArray(items)) {
                mockQuestions = items;
                if (items.length > 0) {
                    nextQuestionId = Math.max(...items.map((i: any) => {
                        const match = i.id.match(/^q(\d+)$/);
                        return match ? parseInt(match[1]) : 0;
                    })) + 1;
                }
                console.log(`[QnA] 로컬 파일에서 질문 ${items.length}건 로드 완료`);
            }
        }
    } catch (err) {
        console.error("[QnA] 질문 데이터 로컬 로드 실패:", err);
    }
}

function saveNoticesToLocalFile() {
    try {
        fs.writeFileSync(DATA_NOTICE_FILE_PATH, JSON.stringify(mockNotices, null, 2), "utf-8");
    } catch (err) {
        console.error("[QnA] 공지사항 로컬 저장 실패:", err);
    }
}

function loadNoticesFromLocalFile() {
    try {
        if (fs.existsSync(DATA_NOTICE_FILE_PATH)) {
            const data = fs.readFileSync(DATA_NOTICE_FILE_PATH, "utf-8");
            const items = JSON.parse(data);
            if (Array.isArray(items)) {
                mockNotices = items;
                if (items.length > 0) {
                    nextNoticeId = Math.max(...items.map((i: any) => {
                        const match = i.id.match(/^notice(\d+)$/);
                        return match ? parseInt(match[1]) : 0;
                    })) + 1;
                }
                console.log(`[QnA] 로컬 파일에서 공지사항 ${items.length}건 로드 완료`);
            }
        }
    } catch (err) {
        console.error("[QnA] 공지사항 로컬 로드 실패:", err);
    }
}

function saveToLocalFile() {
    try {
        fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(mockKnowledgeItems, null, 2), "utf-8");
        console.log(`[QnA] 로컬 파일에 지식 ${mockKnowledgeItems.length}건 저장 완료`);
    } catch (err) {
        console.error("[QnA] 로컬 파일 저장 실패:", err);
    }
}

function loadFromLocalFile() {
    try {
        if (fs.existsSync(DATA_FILE_PATH)) {
            const data = fs.readFileSync(DATA_FILE_PATH, "utf-8");
            const items = JSON.parse(data);
            if (Array.isArray(items)) {
                mockKnowledgeItems = items;
                if (items.length > 0) {
                    nextKnowledgeId = Math.max(...items.map((i: any) => {
                        const match = i.id.match(/^kb(\d+)$/);
                        return match ? parseInt(match[1]) : 0;
                    })) + 1;
                }
                knowledgeLoaded = true;
                console.log(`[QnA] 로컬 파일에서 지식 ${items.length}건 로드 완료`);
            }
        }
    } catch (err) {
        console.error("[QnA] 로컬 파일 로드 실패:", err);
    }
}

// 초기 로드 실행
loadQuestionsFromLocalFile();
loadNoticesFromLocalFile();
// loadFromLocalFile()는 라우터 내부나 필요 시점에 호출됨 (기존 로직 유지)

// ─── AI Service (Integrated) ──────────────────────────────
function buildKnowledgeContext(): string {
    if (mockKnowledgeItems.length === 0) return "";
    let context = "\n\n## 내부 지식 베이스 (참고 자료)\n다음은 구축된 지식체계 정보입니다:\n";
    for (const item of mockKnowledgeItems) {
        context += `\n### [${item.category}] ${item.title}\n${item.content}\n`;
    }
    return context;
}

async function generateAIDraft(title: string, content: string): Promise<string> {
    const geminiKey = (process.env.GOOGLE_GEMINI_API_KEY || "").trim().replace(/^["']|["']$/g, "");
    const anthropicKey = (process.env.ANTHROPIC_API_KEY || "").trim().replace(/^["']|["']$/g, "");

    const knowledgeContext = buildKnowledgeContext();
    console.log(`[QnA] AI 답변 생성 시작: "${title}"`);
    console.log(`[QnA] Anthropic Key Present: ${!!anthropicKey}, Gemini Key Present: ${!!geminiKey}`);
    console.log(`[QnA] Knowledge Context Length: ${knowledgeContext.length}`);

    const systemInstruction = `당신은 경상남도 광역지원기관의 공문 Q&A 담당 AI 어시스턴트입니다.
사회복지사들의 질문에 대해 공문 내용과 내부 지식 베이스를 참조하여 정확하고 친절한 답변 초안을 작성합니다.

답변 작성 시 주의사항:
- 제공된 지식 베이스에 근거한 답변만 작성하세요
- 근거가 없는 내용은 "해당 내용은 확인되지 않습니다"라고 안내하세요
- 답변은 마크다운 형식으로 구조화해주세요
- 관련 조항이나 항목을 구체적으로 인용하세요
${knowledgeContext ? `\n[내부 지식 베이스]\n${knowledgeContext.slice(0, 50000)}` : ""}`;

    const userPrompt = `질문 제목: ${title}\n질문 내용: ${content}\n\n위 질문에 대한 답변 초안을 작성해주세요.`;

    // 1. Try Anthropic (Claude) first if key exists
    if (anthropicKey) {
        try {
            console.log("[QnA] Anthropic(Claude) API 호출 시도...");
            const response = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                    "x-api-key": anthropicKey,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    model: "claude-sonnet-4-6",
                    max_tokens: 2000,
                    system: systemInstruction,
                    messages: [
                        { role: "user", content: userPrompt }
                    ]
                }),
            });

            if (!response.ok) {
                const errorData = await response.text();
                console.error(`[QnA] Anthropic API Error Body: ${errorData}`);
                throw new Error(`Anthropic API Error: ${response.status} ${response.statusText} - ${errorData}`);
            }

            const data: any = await response.json();
            const text = data.content[0]?.text;
            if (text) {
                console.log("[QnA] Anthropic API 답변 생성 성공");
                return text;
            }
        } catch (err: any) {
            console.error("[QnA] Anthropic API 호출 실패, Gemini로 폴백합니다. 원인:", err.message);
        }
    }

    // 2. Fallback to Gemini
    if (geminiKey) {
        try {
            console.log("[QnA] Gemini API 호출 시도...");
            const genAI = new GoogleGenerativeAI(geminiKey);
            const model = genAI.getGenerativeModel({
                model: "gemini-pro",
                systemInstruction: systemInstruction
            });


            const result = await model.generateContent({
                contents: [{ role: "user", parts: [{ text: userPrompt }] }],
                generationConfig: {
                    maxOutputTokens: 2000,
                    temperature: 0.7,
                }
            });

            console.log(`[QnA] Gemini API 답변 생성 성공`);
            return result.response.text();
        } catch (err: any) {
            console.error("Gemini Middleware AI Error Details:", {
                message: err.message,
                status: err.status,
                statusText: err.statusText,
                stack: err.stack
            });
            return `[오류] AI 답변 생성 중 문제가 발생했습니다.\n(상세: ${err.message})\n\n잠시 후 다시 시도해 주시거나, 직접 답변을 작성해 주세요.`;
        }
    }

    console.warn("[QnA] 유효한 API 키 없음: 가상 응답 반환");
    const knowledgeNote = mockKnowledgeItems.length > 0
        ? `\n\n(참고: 내부 지식 베이스에서 ${mockKnowledgeItems.length}개의 지식 항목을 참조했습니다.)`
        : "";
    return `[AI 자동 생성 초안 (가상)]\n\n"${title}"에 대한 답변입니다.\n\n관련 사업지침 및 규정을 검토한 결과, 다음과 같이 안내드립니다:\n\n1. ${content.slice(0, 50)}에 대해서는 해당 사업지침을 참고해주시기 바랍니다.\n2. 추가적인 문의사항이 있으시면 담당자에게 연락 부탁드립니다.\n\n※ 이 답변은 AI가 자동 생성한 초안이며, 관리자 검토 후 최종 답변이 전달됩니다.${knowledgeNote}`;
}

// ─── Auth Middleware ─────────────────────────────────────────
function authenticateToken(req: ExpressRequest, res: ExpressResponse, next: NextFunction): void {
    const authHeader = (req as any).headers?.authorization;
    const token = typeof authHeader === 'string' ? authHeader.split(" ")[1] : null;
    if (!token) {
        console.warn(`[Auth] No token for ${(req as any).path}`);
        (res as any).status(401).json({ error: "인증이 필요합니다." });
        return;
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
        (req as any).user = decoded;
        next();
    } catch (err) {
        console.error(`[Auth] Token verify fail:`, err);
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
        const user = (req as any).user;
        const { status, search } = (req as any).query || {};
        let result = [...mockQuestions];

        // Filter by user role
        if (user.role !== "admin") {
            // Users see their own questions OR public questions
            result = result.filter(q => q.authorOrg === user.orgCode || q.isPublic);
        }

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

        // Sort by createdAt desc
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        res.json(result);
    });

    router.get("/questions/:id", authenticateToken, (req: ExpressRequest, res: ExpressResponse) => {
        const user = (req as any).user;
        const q = mockQuestions.find((q) => q.id === (req as any).params?.id);

        if (!q) {
            res.status(404).json({ error: "질문을 찾을 수 없습니다." });
            return;
        }

        // Check permission
        if (user.role !== "admin" && q.authorOrg !== user.orgCode && !q.isPublic) {
            res.status(403).json({ error: "접근 권한이 없습니다." });
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
        saveQuestionsToLocalFile(); // 저장

        // Generate AI draft
        generateAIDraft(title, content).then(draft => {
            const q = mockQuestions.find((q) => q.id === id);
            if (q && q.status === "pending") {
                q.status = "ai_draft";
                q.aiDraftAnswer = draft;
                saveQuestionsToLocalFile(); // AI 답변 생성 후 업데이트 저장
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
        saveQuestionsToLocalFile(); // 저장
        res.json(q);
    });

    router.delete("/questions/:id", authenticateToken, (req: ExpressRequest, res: ExpressResponse) => {
        const idx = mockQuestions.findIndex((q) => q.id === (req as any).params?.id);
        if (idx === -1) {
            res.status(404).json({ error: "질문을 찾을 수 없습니다." });
            return;
        }
        mockQuestions.splice(idx, 1);
        saveQuestionsToLocalFile(); // 저장
        res.json({ success: true });
    });

    // ── Documents ──
    router.get("/documents", authenticateToken, (_req: ExpressRequest, res: ExpressResponse) => {
        console.log(`[QnA] GET /documents: Returning ${mockDocuments.length} items`);
        res.json(mockDocuments);
    });

    router.post("/documents", authenticateToken, upload.array("files"), async (req: ExpressRequest, res: ExpressResponse) => {
        const { title, documentNumber, managerName, managerPhone, content: manualContent } = (req as any).body || {};
        const files = (req as any).files as Express.Multer.File[];

        if (!title || !documentNumber) {
            res.status(400).json({ error: "제목과 공문번호는 필수입니다." });
            return;
        }

        if (!files || files.length === 0) {
            res.status(400).json({ error: "업로드할 파일이 없습니다." });
            return;
        }

        const results = [];

        for (const file of files) {
            let finalContent = manualContent || "";

            // 텍스트 추출 (수동 입력이 없을 경우)
            if (!manualContent) {
                if (
                    file.mimetype === "text/plain" ||
                    file.mimetype === "text/markdown" ||
                    file.originalname.endsWith(".md") ||
                    file.originalname.endsWith(".txt")
                ) {
                    finalContent = file.buffer.toString("utf-8");
                } else {
                    finalContent = "(업로드된 파일: " + file.originalname + ")";
                }
            }

            const id = `doc${nextDocumentId++}`;
            const finalTitle = files.length > 1 ? `${title} (${file.originalname})` : title;

            const newDoc: MockDocument = {
                id,
                title: finalTitle,
                documentNumber,
                content: finalContent,
                fileUrl: "",
                uploadedAt: new Date().toISOString(),
                uploadedBy: (req as any).user?.name || "unknown",
                managerName,
                managerPhone,
            };
            mockDocuments.unshift(newDoc);
            results.push(newDoc);
        }

        // 로컬 저장
        saveDocumentsToLocalFile();
        res.json({ success: true, count: results.length, documents: results });
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

        saveDocumentsToLocalFile();
        res.json(doc);
    });

    router.patch("/documents/:id/valid-until", authenticateToken, (req: ExpressRequest, res: ExpressResponse) => {
        const doc = mockDocuments.find((d) => d.id === (req as any).params?.id);
        if (!doc) {
            res.status(404).json({ error: "문서를 찾을 수 없습니다." });
            return;
        }
        doc.validUntil = (req as any).body?.validUntil;
        saveDocumentsToLocalFile();
        res.json(doc);
    });

    router.delete("/documents/:id", authenticateToken, (req: ExpressRequest, res: ExpressResponse) => {
        const idx = mockDocuments.findIndex((d) => d.id === (req as any).params?.id);
        if (idx === -1) {
            res.status(404).json({ error: "문서를 찾을 수 없습니다." });
            return;
        }
        mockDocuments.splice(idx, 1);
        saveDocumentsToLocalFile(); // 로컬 저장
        res.json({ success: true });
    });

    // ── Local File Persistence (Questions) ──
    const DATA_QUESTION_FILE_PATH = path.join(process.cwd(), "server-questions-data.json");

    function saveQuestionsToLocalFile() {
        try {
            fs.writeFileSync(DATA_QUESTION_FILE_PATH, JSON.stringify(mockQuestions, null, 2), "utf-8");
        } catch (err) {
            console.error("[QnA] 질문 데이터 로컬 저장 실패:", err);
        }
    }

    function loadQuestionsFromLocalFile() {
        try {
            if (fs.existsSync(DATA_QUESTION_FILE_PATH)) {
                const data = fs.readFileSync(DATA_QUESTION_FILE_PATH, "utf-8");
                const items = JSON.parse(data);
                if (Array.isArray(items)) {
                    mockQuestions = items;
                    if (items.length > 0) {
                        nextQuestionId = Math.max(...items.map((i: any) => {
                            const match = i.id.match(/^q(\d+)$/);
                            return match ? parseInt(match[1]) : 0;
                        })) + 1;
                    }
                    console.log(`[QnA] 로컬 파일에서 질문 ${items.length}건 로드 완료`);
                }
            }
        } catch (err) {
            console.error("[QnA] 질문 데이터 로컬 로드 실패:", err);
        }
    }

    // 초기 로드
    loadQuestionsFromLocalFile();

    // ── Local File Persistence (Documents) ──
    const DATA_FILE_PATH = path.join(process.cwd(), "server-knowledge-data.json");

    function saveToLocalFile() {
        try {
            fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(mockKnowledgeItems, null, 2), "utf-8");
            console.log(`[QnA] 로컬 파일에 지식 ${mockKnowledgeItems.length}건 저장 완료`);
        } catch (err) {
            console.error("[QnA] 로컬 파일 저장 실패:", err);
        }
    }

    function loadFromLocalFile() {
        try {
            if (fs.existsSync(DATA_FILE_PATH)) {
                const data = fs.readFileSync(DATA_FILE_PATH, "utf-8");
                const items = JSON.parse(data);
                if (Array.isArray(items)) {
                    mockKnowledgeItems = items;
                    if (items.length > 0) {
                        nextKnowledgeId = Math.max(...items.map((i: any) => {
                            // id가 숫자형 문자열(kb1, kb2...)인 경우 숫자 부분 추출
                            const match = i.id.match(/^kb(\d+)$/);
                            return match ? parseInt(match[1]) : 0;
                        })) + 1;
                    }
                    knowledgeLoaded = true;
                    console.log(`[QnA] 로컬 파일에서 지식 ${items.length}건 로드 완료`);
                }
            }
        } catch (err) {
            console.error("[QnA] 로컬 파일 로드 실패:", err);
        }
    }

    // ── Knowledge Base Routes ──
    router.get("/knowledge", authenticateToken, async (_req: ExpressRequest, res: ExpressResponse) => {
        try {
            if (!knowledgeLoaded) {
                // 우선 로컬 파일에서 시도
                loadFromLocalFile();
                // Firebase가 되면 거기서도 가져오기 (병합은 추후 고려, 현재는 덮어쓰기 주의)
                if (isFirebaseReady() && mockKnowledgeItems.length === 0) {
                    await loadKnowledgeFromFirestore();
                }
            }
            res.json(mockKnowledgeItems);
        } catch (err) {
            res.json(mockKnowledgeItems);
        }
    });

    router.post("/knowledge", authenticateToken, upload.array("files"), async (req: ExpressRequest, res: ExpressResponse) => {
        const user = (req as any).user as JwtPayload;
        if (user.role !== "admin") {
            res.status(403).json({ error: "관리자만 지식을 등록할 수 있습니다." });
            return;
        }

        const { title, category, content: textContent } = (req as any).body || {};
        const files = (req as any).files as Express.Multer.File[];

        if (!title || !category) {
            res.status(400).json({ error: "제목과 카테고리는 필수입니다." });
            return;
        }

        if (!textContent && (!files || files.length === 0)) {
            res.status(400).json({ error: "내용을 입력하거나 파일을 하나 이상 업로드해주세요." });
            return;
        }

        const results = [];

        // 1. 직접 입력 텍스트 처리 (있는 경우)
        if (textContent && textContent.trim()) {
            const chunks = textContent.match(/[\s\S]{1,500}/g) || [textContent];
            const id = `kb${nextKnowledgeId++}`; // 로컬 ID 사용 통일
            const newItem: MockKnowledgeItem = {
                id,
                title,
                category: category as KnowledgeCategory,
                content: textContent,
                source: "직접입력",
                createdAt: new Date().toISOString(),
                chunkCount: chunks.length,
            };
            mockKnowledgeItems.unshift(newItem);

            // Firebase 저장 시도 (비동기)
            if (isFirebaseReady()) {
                getDb().collection("knowledge").doc(id).set(newItem).catch(err => console.error("Firebase save error:", err));
            }
            results.push(newItem);
        }

        // 2. 업로드된 파일들 처리
        if (files && files.length > 0) {
            for (const file of files) {
                const finalContent = file.buffer.toString("utf-8");
                const source = file.originalname || "파일업로드";
                const chunks = finalContent.match(/[\s\S]{1,500}/g) || [finalContent];

                // 여러 파일일 경우 제목 뒤에 파일명 추가
                const finalTitle = files.length > 1 ? `${title} (${file.originalname})` : title;

                const id = `kb${nextKnowledgeId++}`; // 로컬 ID 사용 통일
                const newItem: MockKnowledgeItem = {
                    id,
                    title: finalTitle,
                    category: category as KnowledgeCategory,
                    content: finalContent,
                    source,
                    createdAt: new Date().toISOString(),
                    chunkCount: chunks.length,
                };
                mockKnowledgeItems.unshift(newItem);

                // Firebase 저장 시도 (비동기)
                if (isFirebaseReady()) {
                    getDb().collection("knowledge").doc(id).set(newItem).catch(err => console.error("Firebase save error:", err));
                }
                results.push(newItem);
            }
        }

        // 로컬 파일 저장
        saveToLocalFile();

        res.json({ success: true, count: results.length, items: results });
    });

    router.delete("/knowledge/:id", authenticateToken, async (req: ExpressRequest, res: ExpressResponse) => {
        const user = (req as any).user as JwtPayload;
        if (user.role !== "admin") {
            res.status(403).json({ error: "관리자만 지식을 삭제할 수 있습니다." });
            return;
        }

        const id = (req as any).params?.id;
        const idx = mockKnowledgeItems.findIndex((k) => k.id === id);
        if (idx === -1) {
            res.status(404).json({ error: "지식 항목을 찾을 수 없습니다." });
            return;
        }
        const removed = mockKnowledgeItems.splice(idx, 1)[0];

        // Firestore에서 삭제
        if (isFirebaseReady()) {
            try {
                await getDb().collection("knowledge").doc(id).delete();
            } catch (err) {
                console.error("[QnA] Firestore 삭제 실패:", err);
            }
        }

        // 로컬 파일 저장
        saveToLocalFile();

        console.log(`지식 삭제: "${removed.title}"`);
        res.json({ success: true });
    });

    // ── Local File Persistence (Documents) ──
    const DATA_DOC_FILE_PATH = path.join(process.cwd(), "server-documents-data.json");

    function saveDocumentsToLocalFile() {
        try {
            // 용량 최적화를 위해 필요하다면 content 길이를 제한하거나 할 수 있음
            // 현재는 텍스트 위주이므로 전체 저장
            fs.writeFileSync(DATA_DOC_FILE_PATH, JSON.stringify(mockDocuments, null, 2), "utf-8");
            console.log(`[QnA] 로컬 파일에 공문 데이터 ${mockDocuments.length}건 저장 완료`);
        } catch (err) {
            console.error("[QnA] 공문 데이터 로컬 저장 실패:", err);
        }
    }

    function loadDocumentsFromLocalFile() {
        try {
            if (fs.existsSync(DATA_DOC_FILE_PATH)) {
                const data = fs.readFileSync(DATA_DOC_FILE_PATH, "utf-8");
                const items = JSON.parse(data);
                if (Array.isArray(items)) {
                    mockDocuments = items;
                    if (items.length > 0) {
                        nextDocumentId = Math.max(...items.map((i: any) => {
                            const match = i.id.match(/^doc(\d+)$/);
                            return match ? parseInt(match[1]) : 0;
                        })) + 1;
                    }
                    console.log(`[QnA] 로컬 파일에서 공문 데이터 ${items.length}건 로드 완료`);
                }
            }
        } catch (err) {
            console.error("[QnA] 공문 데이터 로컬 로드 실패:", err);
        }
    }

    // 초기 서버 기동 시 로드
    loadDocumentsFromLocalFile();

    // Documents 라우터 핸들러에 저장 로직 추가
    // (기존 라우터가 이미 정의되어 있으므로, 파일을 직접 수정하는 방식이 효율적이지 않을 수 있어
    //  위쪽의 router.post("/documents"...) 등을 수정해야 함. 
    //  하지만 replace_file_content는 순차적이므로 여기서 함수만 정의하고
    //  별도의 tool call로 라우터 내부를 수정하는 것이 안전함.
    //  다만 이 블록에서는 함수 정의와 초기 로드만 수행)

    // ── Notices ──
    router.get("/notices", authenticateToken, (req: ExpressRequest, res: ExpressResponse) => {
        const { documentId } = (req as any).query || {};
        let result = [...mockNotices];

        if (documentId) {
            result = result.filter(n => n.relatedDocumentId === documentId);
        }

        // 최신순 정렬
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        res.json(result);
    });

    router.post("/notices", authenticateToken, (req: ExpressRequest, res: ExpressResponse) => {
        const user = (req as any).user as JwtPayload;
        // if (user.role !== "admin") { ... } // 필요 시 권한 체크

        const { content, category, isActive, relatedDocumentId } = (req as any).body || {};
        if (!content) {
            res.status(400).json({ error: "공지 내용을 입력해주세요." });
            return;
        }

        const id = `notice${nextNoticeId++}`;
        const newNotice: MockNotice = {
            id,
            content,
            category: category || "general",
            isActive: isActive ?? true,
            relatedDocumentId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        mockNotices.unshift(newNotice);
        saveNoticesToLocalFile(); // 저장
        res.json({ success: true, id });
    });

    router.patch("/notices/:id", authenticateToken, (req: ExpressRequest, res: ExpressResponse) => {
        const notice = mockNotices.find(n => n.id === (req as any).params?.id);
        if (!notice) {
            res.status(404).json({ error: "공지사항을 찾을 수 없습니다." });
            return;
        }

        const updates = (req as any).body || {};
        Object.assign(notice, updates);
        notice.updatedAt = new Date().toISOString();

        saveNoticesToLocalFile(); // 저장
        res.json(notice);
    });

    // ── Local File Persistence (Notices) ──
    const DATA_NOTICE_FILE_PATH = path.join(process.cwd(), "server-notices-data.json");

    function saveNoticesToLocalFile() {
        try {
            fs.writeFileSync(DATA_NOTICE_FILE_PATH, JSON.stringify(mockNotices, null, 2), "utf-8");
        } catch (err) {
            console.error("[QnA] 공지사항 로컬 저장 실패:", err);
        }
    }

    function loadNoticesFromLocalFile() {
        try {
            if (fs.existsSync(DATA_NOTICE_FILE_PATH)) {
                const data = fs.readFileSync(DATA_NOTICE_FILE_PATH, "utf-8");
                const items = JSON.parse(data);
                if (Array.isArray(items)) {
                    mockNotices = items;
                    if (items.length > 0) {
                        nextNoticeId = Math.max(...items.map((i: any) => {
                            const match = i.id.match(/^notice(\d+)$/);
                            return match ? parseInt(match[1]) : 0;
                        })) + 1;
                    }
                    console.log(`[QnA] 로컬 파일에서 공지사항 ${items.length}건 로드 완료`);
                }
            }
        } catch (err) {
            console.error("[QnA] 공지사항 로컬 로드 실패:", err);
        }
    }

    // 초기 로드
    loadNoticesFromLocalFile();

    // ── Health check ──
    router.get("/health", (_req: ExpressRequest, res: ExpressResponse) => {
        res.json({ status: "ok", mode: "integrated", knowledgeCount: mockKnowledgeItems.length });
    });

    return router;
}

// ─── Create full Express app ─────────────────────────────────
export function createQnAApp() {
    initFirebase();
    const app = express();
    app.use(express.json());
    app.use(createQnARouter());
    return app;
}
