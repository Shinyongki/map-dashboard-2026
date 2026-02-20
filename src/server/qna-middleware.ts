import { Router as ExpressRouter, Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";
import express from "express";
import jwt from "jsonwebtoken";
import multer from "multer";
import fs from "fs";
import path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getOrganizationByCode } from "../lib/organization-data";
import * as pdfParseModule from "pdf-parse";
const pdfParse: (buffer: Buffer) => Promise<{ text: string }> = (pdfParseModule as any).default ?? pdfParseModule;
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

interface EmbeddedChunk {
    id: string;
    knowledgeId: string;
    knowledgeTitle: string;
    category: string;
    text: string;
    embedding: number[];
}

// ─── Config ──────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || "qna-system-secret-2026";
const ADMIN_CODE = process.env.ADMIN_CODE || "1672";

// ─── Mock Data ───────────────────────────────────────────────
let mockQuestions: MockQuestion[] = [];
let mockDocuments: MockDocument[] = [];
let documentsLoaded = false;

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
let mockEmbeddedChunks: EmbeddedChunk[] = [];

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

async function loadDocumentsFromFirestore(): Promise<void> {
    if (documentsLoaded || !isFirebaseReady()) return;
    try {
        const snapshot = await getDb().collection("documents").orderBy("uploadedAt", "desc").get();
        if (snapshot.empty) return;
        mockDocuments = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                title: data.title || "",
                documentNumber: data.documentNumber || "",
                content: data.content || "",
                fileUrl: data.fileUrl || "",
                uploadedAt: data.uploadedAt || new Date().toISOString(),
                uploadedBy: data.uploadedBy || "",
                managerName: data.managerName,
                managerPhone: data.managerPhone,
                validUntil: data.validUntil,
            } as MockDocument;
        });
        if (mockDocuments.length > 0) {
            nextDocumentId = Math.max(...mockDocuments.map((d) => {
                const match = d.id.match(/^doc(\d+)$/);
                return match ? parseInt(match[1]) : 0;
            })) + 1;
        }
        documentsLoaded = true;
        console.log(`[QnA] Firestore에서 공문 ${mockDocuments.length}건 로드 완료`);
    } catch (err) {
        console.error("[QnA] Firestore 공문 로드 실패:", err);
    }
}

// ─── Persistence Helpers ─────────────────────────────────────
const DATA_QUESTION_FILE_PATH = path.join(process.cwd(), "server-questions-data.json");
const DATA_NOTICE_FILE_PATH = path.join(process.cwd(), "server-notices-data.json");
const DATA_FILE_PATH = path.join(process.cwd(), "server-knowledge-data.json");
const EMBEDDINGS_FILE_PATH = path.join(process.cwd(), "server-embeddings-data.json");

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

function saveEmbeddingsToFile(): void {
    try {
        fs.writeFileSync(EMBEDDINGS_FILE_PATH, JSON.stringify(mockEmbeddedChunks, null, 2), "utf-8");
    } catch (err) {
        console.error("[QnA] 임베딩 파일 저장 실패:", err);
    }
}

function loadEmbeddingsFromFile(): void {
    try {
        if (fs.existsSync(EMBEDDINGS_FILE_PATH)) {
            const data = fs.readFileSync(EMBEDDINGS_FILE_PATH, "utf-8");
            const items = JSON.parse(data);
            if (Array.isArray(items)) {
                mockEmbeddedChunks = items;
                console.log(`[QnA] 임베딩 ${items.length}개 chunk 로드 완료`);
            }
        }
    } catch (err) {
        console.error("[QnA] 임베딩 파일 로드 실패:", err);
    }
}

// 초기 로드 실행
loadQuestionsFromLocalFile();
loadNoticesFromLocalFile();
loadEmbeddingsFromFile();
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

// ─── RAG Functions ───────────────────────────────────────────
function chunkText(text: string, size = 1000, overlap = 150): string[] {
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
        chunks.push(text.slice(start, start + size));
        start += size - overlap;
    }
    return chunks;
}

async function embedText(text: string): Promise<number[]> {
    const geminiKey = (process.env.GOOGLE_GEMINI_API_KEY || "").trim().replace(/^["']|["']$/g, "");
    if (!geminiKey) throw new Error("Gemini key not set");

    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${geminiKey}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "models/gemini-embedding-001",
                content: { parts: [{ text: text.slice(0, 2000) }] },
            }),
        }
    );
    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Gemini Embedding API ${res.status}: ${err}`);
    }
    const data: any = await res.json();
    return data.embedding.values;
}

function cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        magA += a[i] * a[i];
        magB += b[i] * b[i];
    }
    if (magA === 0 || magB === 0) return 0;
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

async function retrieveRelevantChunks(query: string, topK = 6): Promise<string> {
    if (mockEmbeddedChunks.length === 0) {
        console.log("[QnA] 임베딩 없음 → 기존 컨텍스트 방식 사용");
        return buildKnowledgeContext().slice(0, 30000);
    }
    try {
        const queryEmbedding = await embedText(query);
        const scored = mockEmbeddedChunks.map(chunk => ({
            chunk,
            score: cosineSimilarity(queryEmbedding, chunk.embedding),
        }));
        scored.sort((a, b) => b.score - a.score);
        const top = scored.slice(0, topK);

        let context = "\n\n## 관련 지식 베이스 (질문 연관 검색 결과)\n";
        for (const { chunk, score } of top) {
            context += `\n### [${chunk.category}] ${chunk.knowledgeTitle} (관련도: ${Math.round(score * 100)}%)\n${chunk.text}\n`;
        }
        console.log(`[QnA] RAG 검색 완료: 상위 ${topK}개 chunk, 총 ${context.length}자`);
        return context;
    } catch (err: any) {
        console.error("[QnA] RAG 검색 실패, 기존 방식 사용:", err.message);
        return buildKnowledgeContext().slice(0, 30000);
    }
}

async function indexKnowledgeItem(item: MockKnowledgeItem): Promise<void> {
    const geminiKey = (process.env.GOOGLE_GEMINI_API_KEY || "").trim().replace(/^["']|["']$/g, "");
    if (!geminiKey) {
        console.warn("[QnA] Gemini 키 없음 - 임베딩 건너뜀");
        return;
    }
    // 기존 chunk 제거
    mockEmbeddedChunks = mockEmbeddedChunks.filter(c => c.knowledgeId !== item.id);

    const chunks = chunkText(item.content);
    const newChunks: EmbeddedChunk[] = [];

    console.log(`[QnA] "${item.title}" 인덱싱 시작: ${chunks.length}개 chunk`);
    for (let i = 0; i < chunks.length; i++) {
        try {
            const embedding = await embedText(chunks[i]);
            newChunks.push({
                id: `${item.id}_chunk${i}`,
                knowledgeId: item.id,
                knowledgeTitle: item.title,
                category: item.category,
                text: chunks[i],
                embedding,
            });
            // Rate limit 방지: 10개마다 200ms 대기
            if (i > 0 && i % 10 === 0) {
                await new Promise(r => setTimeout(r, 200));
            }
        } catch (err: any) {
            console.error(`[QnA] chunk 임베딩 실패 (${item.id}_chunk${i}):`, err.message);
        }
    }

    mockEmbeddedChunks.push(...newChunks);
    saveEmbeddingsToFile();
    console.log(`[QnA] "${item.title}" 인덱싱 완료: ${newChunks.length}/${chunks.length}개 chunk`);
}

async function reindexMissingEmbeddings(): Promise<void> {
    const indexedIds = new Set(mockEmbeddedChunks.map(c => c.knowledgeId));
    const missing = mockKnowledgeItems.filter(item => !indexedIds.has(item.id));
    if (missing.length === 0) {
        console.log("[QnA] 모든 지식 항목이 이미 인덱싱되어 있습니다.");
        return;
    }
    console.log(`[QnA] 백그라운드 인덱싱 시작: ${missing.length}개 항목`);
    for (const item of missing) {
        await indexKnowledgeItem(item);
    }
    console.log("[QnA] 백그라운드 인덱싱 완료");
}

async function generateAIDraft(title: string, content: string, relatedDoc?: MockDocument): Promise<string> {
    const geminiKey = (process.env.GOOGLE_GEMINI_API_KEY || "").trim().replace(/^["']|["']$/g, "");

    const knowledgeContext = await retrieveRelevantChunks(`${title} ${content}`);
    console.log(`[QnA] AI 답변 생성 시작: "${title}"`);
    console.log(`[QnA] Gemini Key Present: ${!!geminiKey}`);
    console.log(`[QnA] Knowledge Context Length: ${knowledgeContext.length}자 (RAG), Related Doc: ${relatedDoc?.title || "없음"}`);

    const docContext = relatedDoc && relatedDoc.content && !relatedDoc.content.startsWith("(업로드된 파일:")
        ? `\n\n## 관련 공문 원문\n- 공문번호: ${relatedDoc.documentNumber}\n- 제목: ${relatedDoc.title}\n\n${relatedDoc.content.slice(0, 30000)}`
        : "";

    const systemInstruction = `당신은 경상남도 광역지원기관의 공문 Q&A 담당 AI 어시스턴트입니다.
사회복지사들의 질문에 대해 공문 원문과 내부 지식 베이스를 참조하여 정확하고 친절한 답변 초안을 작성합니다.

답변 작성 시 주의사항:
- 제공된 [관련 공문 원문] 및 [내부 지식 베이스]에 근거한 답변만 작성하세요
- 근거가 없는 내용은 "해당 내용은 확인되지 않습니다"라고 안내하세요
- 일반 문서(공문) 형식으로 작성하세요. #, ##, **, __, |, - 등 마크다운 기호를 절대 사용하지 마세요
- 이모지(emoji)를 사용하지 마세요
- 제목/소제목은 【 】 또는 ○ 기호를 사용하고, 항목은 1. 2. 3. 또는 가. 나. 다. 형식으로 작성하세요
- 표가 필요한 경우 ┌─┬─┐ / │ / ├─┼─┤ / └─┴─┘ 같은 유니코드 선 문자로 시각적인 표를 그리세요. 마크다운 | 기호 표는 사용하지 마세요
- 관련 조항이나 항목을 구체적으로 인용하세요
${docContext}${knowledgeContext ? `\n\n[내부 지식 베이스]\n${knowledgeContext}` : ""}`;

    const userPrompt = `질문 제목: ${title}\n질문 내용: ${content}\n\n위 질문에 대한 답변 초안을 작성해주세요.`;

    // Gemini 2.0 Flash (primary)
    if (geminiKey) {
        try {
            console.log("[QnA] Gemini 2.0 Flash API 호출 시도...");
            const genAI = new GoogleGenerativeAI(geminiKey);
            const model = genAI.getGenerativeModel({
                model: "gemini-1.5-flash",
                systemInstruction: systemInstruction,
            });

            const result = await model.generateContent({
                contents: [{ role: "user", parts: [{ text: userPrompt }] }],
                generationConfig: {
                    maxOutputTokens: 2000,
                    temperature: 0.7,
                }
            });

            console.log(`[QnA] Gemini 2.0 Flash 답변 생성 성공`);
            return result.response.text();
        } catch (err: any) {
            console.error("[QnA] Gemini API 오류:", {
                message: err.message,
                status: err.status,
                statusText: err.statusText,
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

// multer는 파일명을 latin1로 디코딩하므로 UTF-8 한글 파일명이 깨짐 → 복원
function fixFilename(name: string): string {
    try {
        return Buffer.from(name, "latin1").toString("utf8");
    } catch {
        return name;
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
        const relatedDoc = relatedDocumentId ? mockDocuments.find(d => d.id === relatedDocumentId) : undefined;
        generateAIDraft(title, content, relatedDoc).then(draft => {
            const q = mockQuestions.find((q) => q.id === id);
            if (q && q.status === "pending") {
                q.status = "ai_draft";
                q.aiDraftAnswer = draft;
                saveQuestionsToLocalFile(); // AI 답변 생성 후 업데이트 저장
            }
        }).catch(err => {
            console.error("[QnA] AI 초안 생성 최종 실패:", err);
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

    // ── Question Chat (답변 조정) ──
    router.post("/questions/:id/chat", authenticateToken, async (req: ExpressRequest, res: ExpressResponse) => {
        const user = (req as any).user;
        if (user.role !== "admin") {
            res.status(403).json({ error: "관리자만 접근 가능합니다." });
            return;
        }

        const q = mockQuestions.find((q) => q.id === (req as any).params?.id);
        if (!q) {
            res.status(404).json({ error: "질문을 찾을 수 없습니다." });
            return;
        }

        const { message, conversationHistory = [], currentDraft = "" } = (req as any).body || {};
        if (!message?.trim()) {
            res.status(400).json({ error: "메시지를 입력해주세요." });
            return;
        }

        const geminiKey = (process.env.GOOGLE_GEMINI_API_KEY || "").trim().replace(/^["']|["']$/g, "");

        const draft = currentDraft || q.aiDraftAnswer || "";
        const systemPrompt = `당신은 경상남도 광역지원기관 공문 Q&A 답변 수정 도우미입니다.
관리자가 AI가 생성한 초안 답변을 대화를 통해 수정·보완할 수 있도록 돕습니다.

## 원본 질문
- 제목: ${q.title}
- 내용: ${q.content}

## 현재 답변 초안
${draft || "(아직 초안 없음)"}

## 지시사항
- 수정 요청(예: "더 간결하게", "3번 항목 자세히", "항목별로 정리") 시: 수정된 **완전한** 답변문을 제공하세요.
- 답변문 작성 시 #, ##, **, __ 등 마크다운 기호를 사용하지 마세요. 이모지도 사용하지 마세요.
- 제목/소제목은 【 】 또는 ○ 기호를 사용하고, 항목은 1. 2. 3. 또는 가. 나. 다. 형식으로 작성하세요.
- 표가 필요한 경우 ┌─┬─┐ / │ / ├─┼─┤ / └─┴─┘ 같은 유니코드 선 문자로 시각적인 표를 그리세요.
- 간단한 질문 시: 간결하게 안내해주세요.
- 항상 한국어로 응답하세요.`;

        const messages = [
            ...conversationHistory.map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content })),
            { role: "user" as const, content: message },
        ];

        // Gemini 2.0 Flash (primary)
        if (geminiKey) {
            try {
                const genAI = new GoogleGenerativeAI(geminiKey);
                const model = genAI.getGenerativeModel({
                    model: "gemini-1.5-flash",
                    systemInstruction: systemPrompt,
                });
                const geminiHistory = conversationHistory.map((m: any) => ({
                    role: m.role === "assistant" ? "model" : "user",
                    parts: [{ text: m.content }],
                }));
                const chat = model.startChat({ history: geminiHistory });
                const result = await chat.sendMessage(message);
                res.json({ reply: result.response.text() });
                return;
            } catch (err: any) {
                console.error("[QnA] Chat Gemini 실패:", err.message);
                res.status(500).json({ error: "AI 응답 생성에 실패했습니다." });
                return;
            }
        }

        res.status(503).json({ error: "AI 서비스를 사용할 수 없습니다." });
    });

    // ── Documents ──
    router.get("/documents", authenticateToken, async (_req: ExpressRequest, res: ExpressResponse) => {
        if (!documentsLoaded) {
            loadDocumentsFromLocalFile();
            if (isFirebaseReady()) {
                // Firebase가 있으면 항상 Firebase를 source of truth로 사용
                await loadDocumentsFromFirestore();
            } else {
                // Firebase 없을 때는 로컬 파일로 완료 처리
                documentsLoaded = true;
            }
        }
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
                } else if (
                    file.mimetype === "application/pdf" ||
                    file.originalname.endsWith(".pdf")
                ) {
                    try {
                        const parsed = await pdfParse(file.buffer);
                        finalContent = parsed.text || "(PDF 내용 추출 실패)";
                        console.log(`[QnA] PDF 파싱 완료: ${fixFilename(file.originalname)} (${finalContent.length}자)`);
                    } catch (err) {
                        console.error("[QnA] PDF 파싱 오류:", err);
                        finalContent = "(PDF 파싱 오류: " + fixFilename(file.originalname) + ")";
                    }
                } else {
                    finalContent = "(지원하지 않는 파일 형식: " + fixFilename(file.originalname) + " - PDF, TXT, MD 파일을 사용해주세요)";
                }
            }

            const id = `doc${nextDocumentId++}`;
            const finalTitle = files.length > 1 ? `${title} (${fixFilename(file.originalname)})` : title;

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

    router.patch("/documents/:id", authenticateToken, upload.single("file"), async (req: ExpressRequest, res: ExpressResponse) => {
        const doc = mockDocuments.find((d) => d.id === (req as any).params?.id);
        if (!doc) {
            res.status(404).json({ error: "문서를 찾을 수 없습니다." });
            return;
        }

        const file = (req as any).file as Express.Multer.File | undefined;
        const { title, documentNumber, managerName, managerPhone, content: manualContent } = (req as any).body || {};

        if (title) doc.title = title;
        if (documentNumber) doc.documentNumber = documentNumber;
        if (managerName !== undefined) doc.managerName = managerName;
        if (managerPhone !== undefined) doc.managerPhone = managerPhone;

        let newContent = manualContent !== undefined ? manualContent : doc.content;

        if (file && !manualContent) {
            if (file.mimetype === "application/pdf" || file.originalname.endsWith(".pdf")) {
                try {
                    const parsed = await pdfParse(file.buffer);
                    newContent = parsed.text || "(PDF 내용 추출 실패)";
                } catch (err) {
                    newContent = "(PDF 파싱 오류)";
                }
            } else {
                newContent = file.buffer.toString("utf-8");
            }
        }

        doc.content = newContent;

        saveDocumentsToLocalFile();
        if (isFirebaseReady()) {
            getDb().collection("documents").doc(doc.id).update({
                title: doc.title,
                documentNumber: doc.documentNumber,
                managerName: doc.managerName,
                managerPhone: doc.managerPhone,
                content: doc.content,
            }).catch(console.error);
        }
        res.json(doc);
    });

    // 공문 파일 교체 (내용 재업로드)
    router.post("/documents/:id/reupload", authenticateToken, upload.single("file"), async (req: ExpressRequest, res: ExpressResponse) => {
        const doc = mockDocuments.find((d) => d.id === (req as any).params?.id);
        if (!doc) { res.status(404).json({ error: "문서를 찾을 수 없습니다." }); return; }

        const file = (req as any).file as Express.Multer.File | undefined;
        const manualContent = (req as any).body?.content as string | undefined;

        if (!file && !manualContent) {
            res.status(400).json({ error: "파일 또는 내용을 입력해주세요." });
            return;
        }

        let newContent = manualContent || "";
        if (file && !manualContent) {
            if (file.mimetype === "application/pdf" || file.originalname.endsWith(".pdf")) {
                try {
                    const parsed = await pdfParse(file.buffer);
                    newContent = parsed.text || "(PDF 내용 추출 실패)";
                    console.log(`[QnA] PDF 재업로드 파싱 완료: ${fixFilename(file.originalname)} (${newContent.length}자)`);
                } catch (err) {
                    newContent = "(PDF 파싱 오류)";
                }
            } else {
                newContent = file.buffer.toString("utf-8");
            }
        }

        doc.content = newContent;
        saveDocumentsToLocalFile();
        if (isFirebaseReady()) {
            getDb().collection("documents").doc(doc.id).update({ content: newContent }).catch(console.error);
        }
        res.json({ success: true, contentLength: newContent.length });
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
                const source = fixFilename(file.originalname) || "파일업로드";
                const chunks = finalContent.match(/[\s\S]{1,500}/g) || [finalContent];

                // 여러 파일일 경우 제목 뒤에 파일명 추가
                const finalTitle = files.length > 1 ? `${title} (${fixFilename(file.originalname)})` : title;

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

        // 백그라운드 임베딩 인덱싱
        Promise.all(results.map(item => indexKnowledgeItem(item)))
            .catch(err => console.error("[QnA] 지식 인덱싱 실패:", err));

        res.json({ success: true, count: results.length, items: results });
    });

    // ── Knowledge Reindex ──
    router.post("/knowledge/reindex", authenticateToken, async (req: ExpressRequest, res: ExpressResponse) => {
        const user = (req as any).user as JwtPayload;
        if (user.role !== "admin") {
            res.status(403).json({ error: "관리자만 재인덱싱할 수 있습니다." });
            return;
        }
        // 전체 재인덱싱 (기존 임베딩 초기화 후)
        mockEmbeddedChunks = [];
        saveEmbeddingsToFile();
        res.json({ success: true, message: `${mockKnowledgeItems.length}개 항목 재인덱싱 시작` });
        // 응답 후 백그라운드 처리
        reindexMissingEmbeddings().catch(err => console.error("[QnA] 재인덱싱 실패:", err));
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

        // 임베딩 chunk 제거
        mockEmbeddedChunks = mockEmbeddedChunks.filter(c => c.knowledgeId !== id);
        saveEmbeddingsToFile();

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
                        // documentsLoaded는 여기서 세팅하지 않음 — Firebase가 있으면 Firebase를 source of truth로 사용
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
        const indexedIds = new Set(mockEmbeddedChunks.map(c => c.knowledgeId));
        res.json({
            status: "ok",
            mode: "integrated",
            knowledgeCount: mockKnowledgeItems.length,
            embeddedChunks: mockEmbeddedChunks.length,
            indexedItems: indexedIds.size,
            ragReady: mockEmbeddedChunks.length > 0,
        });
    });

    return router;
}

// ─── Create full Express app ─────────────────────────────────
export function createQnAApp() {
    initFirebase();
    const app = express();
    app.use(express.json());
    app.use(createQnARouter());

    // 지식 항목 로드 후 누락된 임베딩 백그라운드 인덱싱
    setTimeout(() => {
        loadFromLocalFile();
        reindexMissingEmbeddings().catch(err =>
            console.error("[QnA] 초기 인덱싱 실패:", err)
        );
    }, 2000); // 서버 완전 기동 후 2초 뒤 실행

    return app;
}
