import { Router as ExpressRouter, Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";
import express from "express";
import jwt from "jsonwebtoken";
import multer from "multer";
import fs from "fs";
import path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
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
const UNIFIED_SESSION_FILE_PATH = path.join(process.cwd(), "server-unified-session.json");
const PROMPT_PATCHES_FILE_PATH = path.join(process.cwd(), "server-prompt-patches.json");
const CODE_TASKS_FILE_PATH = path.join(process.cwd(), "server-code-tasks.json");

// ─── Unified Session (단일 컨텍스트 공유 대화 저장소) ─────────────
interface UnifiedEntry {
    role: "user" | "noma" | "sena" | "insight" | "decision" | "action" | "claude_code";
    content: string;
    timestamp: string;
}

let unifiedSession: UnifiedEntry[] = [];
const UNIFIED_SESSION_MAX = 200;
const UNIFIED_FIRESTORE_COLLECTION = "unifiedSession";

function saveUnifiedSession() {
    try {
        fs.writeFileSync(UNIFIED_SESSION_FILE_PATH, JSON.stringify(unifiedSession, null, 2), "utf-8");
    } catch (err) {
        console.error("[UnifiedSession] 로컬 저장 실패:", err);
    }
}

async function loadUnifiedSession() {
    // Firebase 우선
    if (isFirebaseReady()) {
        try {
            const snapshot = await getDb()
                .collection(UNIFIED_FIRESTORE_COLLECTION)
                .orderBy("timestamp", "asc")
                .limit(UNIFIED_SESSION_MAX)
                .get();
            unifiedSession = snapshot.docs.map((doc) => doc.data() as UnifiedEntry);
            console.log(`[UnifiedSession] Firestore에서 ${unifiedSession.length}개 로드 완료`);
            return;
        } catch (err) {
            console.warn("[UnifiedSession] Firestore 로드 실패, 로컬 파일 사용:", err);
        }
    }
    // 로컬 파일 폴백
    try {
        if (fs.existsSync(UNIFIED_SESSION_FILE_PATH)) {
            const data = fs.readFileSync(UNIFIED_SESSION_FILE_PATH, "utf-8");
            const items = JSON.parse(data);
            if (Array.isArray(items)) {
                unifiedSession = items;
                console.log(`[UnifiedSession] 로컬 파일에서 ${items.length}개 로드 완료`);
            }
        }
    } catch (err) {
        console.error("[UnifiedSession] 로드 실패:", err);
    }
}

async function appendUnified(entry: UnifiedEntry) {
    unifiedSession.push(entry);
    if (unifiedSession.length > UNIFIED_SESSION_MAX) {
        unifiedSession = unifiedSession.slice(-UNIFIED_SESSION_MAX);
    }
    // Firebase 우선 저장
    if (isFirebaseReady()) {
        try {
            await getDb().collection(UNIFIED_FIRESTORE_COLLECTION).add(entry);
            return;
        } catch (err) {
            console.warn("[UnifiedSession] Firestore 저장 실패, 로컬 파일 사용:", err);
        }
    }
    saveUnifiedSession();
}

async function clearUnifiedSession() {
    unifiedSession = [];
    // Firebase 전체 삭제
    if (isFirebaseReady()) {
        try {
            const snapshot = await getDb().collection(UNIFIED_FIRESTORE_COLLECTION).get();
            const batch = getDb().batch();
            snapshot.docs.forEach((doc) => batch.delete(doc.ref));
            await batch.commit();
            return;
        } catch (err) {
            console.warn("[UnifiedSession] Firestore 삭제 실패:", err);
        }
    }
    saveUnifiedSession();
}

// ─── Prompt Patches (세나 → 노마 시스템 프롬프트 패치) ─────────────
interface PromptPatch {
    id: string;
    title: string;
    content: string;
    proposedBy: "sena" | "manual";
    timestamp: string;
}

let promptPatches: PromptPatch[] = [];
const PROMPT_PATCHES_COLLECTION = "promptPatches";

function savePromptPatchesToLocalFile() {
    try {
        fs.writeFileSync(PROMPT_PATCHES_FILE_PATH, JSON.stringify(promptPatches, null, 2), "utf-8");
    } catch (err) {
        console.error("[PromptPatches] 로컬 저장 실패:", err);
    }
}

async function loadPromptPatches() {
    if (isFirebaseReady()) {
        try {
            const snapshot = await getDb()
                .collection(PROMPT_PATCHES_COLLECTION)
                .orderBy("timestamp", "asc")
                .get();
            promptPatches = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as PromptPatch));
            console.log(`[PromptPatches] Firestore에서 ${promptPatches.length}개 로드 완료`);
            return;
        } catch (err) {
            console.warn("[PromptPatches] Firestore 로드 실패, 로컬 파일 사용:", err);
        }
    }
    try {
        if (fs.existsSync(PROMPT_PATCHES_FILE_PATH)) {
            const data = fs.readFileSync(PROMPT_PATCHES_FILE_PATH, "utf-8");
            const items = JSON.parse(data);
            if (Array.isArray(items)) {
                promptPatches = items;
                console.log(`[PromptPatches] 로컬 파일에서 ${items.length}개 로드 완료`);
            }
        }
    } catch (err) {
        console.error("[PromptPatches] 로드 실패:", err);
    }
}

async function appendPromptPatch(patch: Omit<PromptPatch, "id">): Promise<PromptPatch> {
    if (isFirebaseReady()) {
        try {
            const ref = await getDb().collection(PROMPT_PATCHES_COLLECTION).add(patch);
            const created = { id: ref.id, ...patch };
            promptPatches.push(created);
            return created;
        } catch (err) {
            console.warn("[PromptPatches] Firestore 저장 실패, 로컬 파일 사용:", err);
        }
    }
    const created = { id: `patch_${Date.now()}`, ...patch };
    promptPatches.push(created);
    savePromptPatchesToLocalFile();
    return created;
}

async function deletePromptPatch(id: string): Promise<boolean> {
    const before = promptPatches.length;
    promptPatches = promptPatches.filter((p) => p.id !== id);
    if (promptPatches.length === before) return false;
    if (isFirebaseReady()) {
        try {
            await getDb().collection(PROMPT_PATCHES_COLLECTION).doc(id).delete();
            return true;
        } catch (err) {
            console.warn("[PromptPatches] Firestore 삭제 실패:", err);
        }
    }
    savePromptPatchesToLocalFile();
    return true;
}

// ─── Code Tasks (대화창 세나 → 터미널 세나 작업 요청) ─────────────
interface CodeTask {
    id: string;
    type: "bug_fix" | "feature_request" | "analysis" | "question";
    title: string;
    description: string;
    context: string;
    status: "pending" | "resolved";
    proposedBy: "sena";
    timestamp: string;
    resolution?: string;
    resolvedAt?: string;
}

let codeTasks: CodeTask[] = [];
const CODE_TASKS_COLLECTION = "codeTasks";

function saveCodeTasksToLocalFile() {
    try {
        fs.writeFileSync(CODE_TASKS_FILE_PATH, JSON.stringify(codeTasks, null, 2), "utf-8");
    } catch (err) {
        console.error("[CodeTasks] 로컬 저장 실패:", err);
    }
}

async function loadCodeTasks() {
    if (isFirebaseReady()) {
        try {
            const snapshot = await getDb()
                .collection(CODE_TASKS_COLLECTION)
                .orderBy("timestamp", "desc")
                .get();
            codeTasks = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as CodeTask));
            console.log(`[CodeTasks] Firestore에서 ${codeTasks.length}개 로드 완료`);
            return;
        } catch (err) {
            console.warn("[CodeTasks] Firestore 로드 실패, 로컬 파일 사용:", err);
        }
    }
    try {
        if (fs.existsSync(CODE_TASKS_FILE_PATH)) {
            const data = fs.readFileSync(CODE_TASKS_FILE_PATH, "utf-8");
            const items = JSON.parse(data);
            if (Array.isArray(items)) {
                codeTasks = items;
                console.log(`[CodeTasks] 로컬 파일에서 ${items.length}개 로드 완료`);
            }
        }
    } catch (err) {
        console.error("[CodeTasks] 로드 실패:", err);
    }
}

async function appendCodeTask(task: Omit<CodeTask, "id">): Promise<CodeTask> {
    if (isFirebaseReady()) {
        try {
            const ref = await getDb().collection(CODE_TASKS_COLLECTION).add(task);
            const created = { id: ref.id, ...task };
            codeTasks.unshift(created);
            return created;
        } catch (err) {
            console.warn("[CodeTasks] Firestore 저장 실패, 로컬 파일 사용:", err);
        }
    }
    const created = { id: `task_${Date.now()}`, ...task };
    codeTasks.unshift(created);
    saveCodeTasksToLocalFile();
    return created;
}

async function resolveCodeTask(id: string, resolution: string): Promise<boolean> {
    const task = codeTasks.find((t) => t.id === id);
    if (!task) return false;
    task.status = "resolved";
    task.resolution = resolution;
    task.resolvedAt = new Date().toISOString();
    if (isFirebaseReady()) {
        try {
            await getDb().collection(CODE_TASKS_COLLECTION).doc(id).update({
                status: "resolved",
                resolution,
                resolvedAt: task.resolvedAt,
            });
            return true;
        } catch (err) {
            console.warn("[CodeTasks] Firestore resolve 실패:", err);
        }
    }
    saveCodeTasksToLocalFile();
    return true;
}

async function deleteCodeTaskById(id: string): Promise<boolean> {
    const before = codeTasks.length;
    codeTasks = codeTasks.filter((t) => t.id !== id);
    if (codeTasks.length === before) return false;
    if (isFirebaseReady()) {
        try {
            await getDb().collection(CODE_TASKS_COLLECTION).doc(id).delete();
            return true;
        } catch (err) {
            console.warn("[CodeTasks] Firestore 삭제 실패:", err);
        }
    }
    saveCodeTasksToLocalFile();
    return true;
}

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
// unified session은 Firebase 초기화 후에 로드 (createQnAApp에서 호출)
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
- "~에 따라", "~에 따르면", "~에 의하면" 같은 인용 표현을 사용하지 마세요. 대신 내용을 직접 서술하세요 (예: "교육 대상은 전담사회복지사입니다")
${docContext}${knowledgeContext ? `\n\n[내부 지식 베이스]\n${knowledgeContext}` : ""}`;

    const userPrompt = `질문 제목: ${title}\n질문 내용: ${content}\n\n위 질문에 대한 답변 초안을 작성해주세요.`;

    // Gemini 2.0 Flash (primary)
    if (geminiKey) {
        try {
            console.log("[QnA] Gemini 2.0 Flash API 호출 시도...");
            const genAI = new GoogleGenerativeAI(geminiKey);
            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
                systemInstruction: systemInstruction,
            });

            const result = await model.generateContent({
                contents: [{ role: "user", parts: [{ text: userPrompt }] }],
                generationConfig: {
                    maxOutputTokens: 4000,
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
                    model: "gemini-2.5-flash",
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

    // ── Dashboard AI Chat (공개 엔드포인트) ──
    router.post("/ai-chat", async (req: ExpressRequest, res: ExpressResponse) => {
        const { messages = [], systemPrompt = "" } = (req as any).body || {};
        const geminiKey = (process.env.GOOGLE_GEMINI_API_KEY || "").trim().replace(/^["']|["']$/g, "");

        if (!geminiKey) {
            res.status(503).json({ error: "AI 서비스가 설정되지 않았습니다." });
            return;
        }

        const lastMessage = messages[messages.length - 1];
        if (!lastMessage) {
            res.status(400).json({ error: "메시지가 없습니다." });
            return;
        }

        try {
            // 지식베이스 RAG 검색 — 질문과 관련된 문서 청크를 시스템 컨텍스트에 추가
            let ragContext = "";
            if (mockEmbeddedChunks.length > 0) {
                try {
                    ragContext = await retrieveRelevantChunks(lastMessage.content, 8);
                    if (ragContext) {
                        console.log(`[노마] RAG 검색 완료: ${ragContext.length}자`);
                    }
                } catch (e: any) {
                    console.warn("[노마] RAG 검색 실패 (무시):", e.message);
                }
            }

            const fullSystemPrompt = systemPrompt + (ragContext ? `\n\n## 관련 지식베이스 검색 결과\n${ragContext}` : "");

            // SSE 헤더 설정
            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Cache-Control", "no-cache");
            res.setHeader("Connection", "keep-alive");
            res.flushHeaders();

            // ── Function Calling 정의 ─────────────────────────────────
            const nomaTools: any[] = [{
                functionDeclarations: [
                    {
                        name: "get_pending_questions",
                        description: "현재 답변 대기 중인 QnA 질문 목록을 가져옵니다. 처리 현황 파악 및 우선순위 결정에 활용하세요.",
                        parameters: { type: "OBJECT", properties: {}, required: [] },
                    },
                    {
                        name: "get_question_detail",
                        description: "특정 질문의 상세 내용(질문 본문, 기관명, 제출일, 현재 답변 상태)을 가져옵니다.",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                question_id: { type: "STRING", description: "조회할 질문의 ID" },
                            },
                            required: ["question_id"],
                        },
                    },
                    {
                        name: "search_knowledge",
                        description: "지식베이스에서 특정 주제·규정·지침을 검색합니다. RAG 임베딩 검색을 사용합니다.",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                query: { type: "STRING", description: "검색할 주제나 키워드" },
                            },
                            required: ["query"],
                        },
                    },
                ],
            }];

            // ── 함수 실행기 ──────────────────────────────────────────
            const executeNomaFunction = async (name: string, args: any): Promise<any> => {
                console.log(`[노마] 함수 호출: ${name}`, args);
                switch (name) {
                    case "get_pending_questions": {
                        const pending = mockQuestions.filter(
                            (q) => q.status === "pending" || q.status === "ai_draft"
                        );
                        return {
                            total: pending.length,
                            questions: pending.slice(0, 15).map((q) => ({
                                id: q.id,
                                title: q.title || q.content.slice(0, 60),
                                organization: q.authorOrgName,
                                submittedAt: q.createdAt,
                                status: q.status,
                                category: q.category,
                            })),
                        };
                    }
                    case "get_question_detail": {
                        const q = mockQuestions.find((q) => q.id === args.question_id);
                        if (!q) return { error: `질문 ID ${args.question_id}를 찾을 수 없습니다.` };
                        return {
                            id: q.id,
                            title: q.title,
                            content: q.content,
                            organization: q.authorOrgName,
                            author: q.authorName,
                            category: q.category,
                            status: q.status,
                            aiDraftAnswer: q.aiDraftAnswer || null,
                            finalAnswer: q.finalAnswer || null,
                            answeredAt: q.answeredAt || null,
                            createdAt: q.createdAt,
                        };
                    }
                    case "search_knowledge": {
                        const results = await retrieveRelevantChunks(args.query, 6);
                        return { results: results || "관련 지식을 찾을 수 없습니다." };
                    }
                    default:
                        return { error: `알 수 없는 함수: ${name}` };
                }
            };

            const genAI = new GoogleGenerativeAI(geminiKey);
            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-pro",
                systemInstruction: fullSystemPrompt || undefined,
                tools: nomaTools,
                generationConfig: {
                    thinkingConfig: { thinkingBudget: 8000 },
                } as any,
            });

            const history = messages.slice(0, -1).map((m: any) => ({
                role: m.role === "assistant" ? "model" : "user",
                parts: [{ text: m.content }],
            }));

            const chat = model.startChat({ history });

            // ── 스트리밍 + Function Calling 처리 ────────────────────
            const streamWithFunctionCalling = async (userMessage: string) => {
                const result = await chat.sendMessageStream(userMessage);

                const functionCalls: Array<{ name: string; args: any }> = [];
                for await (const chunk of result.stream) {
                    const parts = chunk.candidates?.[0]?.content?.parts ?? [];
                    for (const part of parts) {
                        if ((part as any).functionCall) {
                            functionCalls.push({
                                name: (part as any).functionCall.name,
                                args: (part as any).functionCall.args ?? {},
                            });
                        } else if ((part as any).text) {
                            res.write(`data: ${JSON.stringify({ text: (part as any).text })}\n\n`);
                        }
                    }
                }

                // 함수 호출이 있으면 실행 후 결과를 모델에 전달
                if (functionCalls.length > 0) {
                    const functionResponses = await Promise.all(
                        functionCalls.map(async (fc) => ({
                            functionResponse: {
                                name: fc.name,
                                response: await executeNomaFunction(fc.name, fc.args),
                            },
                        }))
                    );

                    // 함수 결과로 최종 응답 스트리밍
                    const result2 = await chat.sendMessageStream(functionResponses as any);
                    for await (const chunk of result2.stream) {
                        const text = chunk.text();
                        if (text) {
                            res.write(`data: ${JSON.stringify({ text })}\n\n`);
                        }
                    }
                }
            };

            await streamWithFunctionCalling(lastMessage.content);

            res.write("data: [DONE]\n\n");
            res.end();
        } catch (err: any) {
            console.error("[AI Chat] Gemini 오류:", err.message);
            if (!res.headersSent) {
                res.status(500).json({ error: err.message });
            } else {
                res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
                res.end();
            }
        }
    });

    // ── Unified Session (단일 컨텍스트) API ──
    router.get("/unified-session", (req: ExpressRequest, res: ExpressResponse) => {
        res.json(unifiedSession);
    });

    router.post("/unified-session", async (req: ExpressRequest, res: ExpressResponse) => {
        const { role, content } = (req as any).body || {};
        if (!role || !content) {
            res.status(400).json({ error: "role과 content가 필요합니다." });
            return;
        }
        await appendUnified({ role, content, timestamp: new Date().toISOString() });
        res.json({ ok: true, total: unifiedSession.length });
    });

    router.delete("/unified-session", async (req: ExpressRequest, res: ExpressResponse) => {
        await clearUnifiedSession();
        res.json({ ok: true });
    });

    // ── Prompt Patches API ──
    router.get("/prompt-patches", (req: ExpressRequest, res: ExpressResponse) => {
        res.json(promptPatches);
    });

    router.delete("/prompt-patches/:id", async (req: ExpressRequest, res: ExpressResponse) => {
        const id = req.params.id as string;
        const deleted = await deletePromptPatch(id);
        if (deleted) {
            res.json({ ok: true });
        } else {
            res.status(404).json({ error: "패치를 찾을 수 없습니다." });
        }
    });

    // ── Code Tasks API (대화창 세나 → 터미널 세나 협업) ──
    router.get("/code-tasks", (_req: ExpressRequest, res: ExpressResponse) => {
        res.json(codeTasks);
    });

    router.post("/code-tasks/:id/resolve", async (req: ExpressRequest, res: ExpressResponse) => {
        const id = req.params.id as string;
        const { resolution } = (req as any).body || {};
        if (!resolution) {
            res.status(400).json({ error: "resolution이 필요합니다." });
            return;
        }
        const ok = await resolveCodeTask(id, resolution);
        if (ok) {
            // 완료 결과를 unified session에도 기록
            await appendUnified({
                role: "claude_code",
                content: `[코드 작업 완료] ${codeTasks.find(t => t.id === id)?.title ?? id}\n\n${resolution}`,
                timestamp: new Date().toISOString(),
            });
            res.json({ ok: true });
        } else {
            res.status(404).json({ error: "작업을 찾을 수 없습니다." });
        }
    });

    router.delete("/code-tasks/:id", async (req: ExpressRequest, res: ExpressResponse) => {
        const id = req.params.id as string;
        const deleted = await deleteCodeTaskById(id);
        if (deleted) {
            res.json({ ok: true });
        } else {
            res.status(404).json({ error: "작업을 찾을 수 없습니다." });
        }
    });

    // ── Triple Chat (노마 + 세나 3자 대화) ──
    router.post("/triple-chat", async (req: ExpressRequest, res: ExpressResponse) => {
        const { messages = [], systemPrompt = "" } = (req as any).body || {};
        const geminiKey = (process.env.GOOGLE_GEMINI_API_KEY || "").trim().replace(/^["']|["']$/g, "");
        const anthropicKey = (process.env.ANTHROPIC_API_KEY || "").trim().replace(/^["']|["']$/g, "");

        if (!geminiKey || !anthropicKey) {
            res.status(503).json({ error: "AI 서비스가 설정되지 않았습니다." });
            return;
        }

        const lastMessage = messages[messages.length - 1];
        if (!lastMessage) {
            res.status(400).json({ error: "메시지가 없습니다." });
            return;
        }

        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders();

        const writeChunk = (source: "noma" | "claude", text: string) => {
            res.write(`data: ${JSON.stringify({ source, text })}\n\n`);
        };

        try {
            // ── 0. 사용자 메시지 → unified session 저장 ───────────────
            await appendUnified({ role: "user", content: lastMessage.content, timestamp: new Date().toISOString() });

            // ── 1. 노마(Gemini 2.5 Pro) 응답 ─────────────────────────
            let ragContext = "";
            if (mockEmbeddedChunks.length > 0) {
                try {
                    ragContext = await retrieveRelevantChunks(lastMessage.content, 8);
                } catch { /* 무시 */ }
            }

            const nomaSystemPrompt = systemPrompt + (ragContext ? `\n\n## 관련 지식베이스 검색 결과\n${ragContext}` : "");

            const genAI = new GoogleGenerativeAI(geminiKey);
            const nomaModel = genAI.getGenerativeModel({
                model: "gemini-2.5-pro",
                systemInstruction: nomaSystemPrompt || undefined,
                generationConfig: { thinkingConfig: { thinkingBudget: 4000 } } as any,
            });

            // 노마 히스토리: user/noma만 사용 (Gemini user/model 교대 엄수)
            // 세나 발언은 시스템 프롬프트의 unified session 이력으로 전달 — API 히스토리에 주입하지 않음
            const nomaHistory: { role: "user" | "model"; parts: { text: string }[] }[] = [];
            for (const m of messages.slice(0, -1)) {
                if (m.role === "user") {
                    nomaHistory.push({ role: "user", parts: [{ text: `[사용자] ${m.content}` }] });
                } else if (m.role === "noma") {
                    nomaHistory.push({ role: "model", parts: [{ text: m.content || "(응답 없음)" }] });
                }
                // claude/sena 발언은 skip — unified session 이력에서 처리
            }

            const nomaChat = nomaModel.startChat({ history: nomaHistory });
            const nomaResult = await nomaChat.sendMessageStream(`[사용자] ${lastMessage.content}`);

            let nomaFullResponse = "";
            for await (const chunk of nomaResult.stream) {
                const text = chunk.text();
                if (text) {
                    nomaFullResponse += text;
                    writeChunk("noma", text);
                }
            }

            // 노마 응답 → unified session 저장
            if (nomaFullResponse) {
                await appendUnified({ role: "noma", content: nomaFullResponse, timestamp: new Date().toISOString() });
            }

            // ── 2. 노마 응답 구분선 ────────────────────────────────────
            res.write(`data: ${JSON.stringify({ source: "noma", done: true })}\n\n`);

            // ── 3. 세나(선배 컨설턴트) 응답 ─────────────────────────
            // unified session 이력: insight/decision/action 최근 8개, 대화는 최근 10개 (토큰 절약)
            const HISTORY_CONTENT_MAX = 600; // 항목당 최대 600자
            const truncateEntry = (text: string) =>
                text.length > HISTORY_CONTENT_MAX ? text.slice(0, HISTORY_CONTENT_MAX) + "…(생략)" : text;
            const roleLabel: Record<string, string> = {
                user: "사용자", noma: "노마", sena: "세나",
                insight: "💡 인사이트", decision: "✅ 결정", action: "⚡ 액션",
            };
            const importantEntries = unifiedSession.filter(
                (e) => e.role === "insight" || e.role === "decision" || e.role === "action"
            ).slice(-8); // 최근 8개만 유지
            const recentConversation = unifiedSession
                .filter((e) => e.role === "user" || e.role === "noma" || e.role === "sena")
                .slice(-10); // 30 → 10으로 축소
            // 중요 항목 + 최근 대화를 시간순으로 병합 (중복 제거)
            const importantIds = new Set(importantEntries.map((e) => e.timestamp + e.role));
            const merged = [
                ...importantEntries,
                ...recentConversation.filter((e) => !importantIds.has(e.timestamp + e.role)),
            ].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

            const unifiedHistoryText = merged.length > 0
                ? "\n\n## 공유 대화 이력 (노마·사용자·세나 3자 전체 기록)\n" +
                  (importantEntries.length > 0
                      ? "### 📌 누적 인사이트·결정·액션 (최근 8개)\n" +
                        importantEntries.map(e => `[${roleLabel[e.role]}] ${truncateEntry(e.content)}`).join("\n\n") +
                        "\n\n### 💬 최근 대화 (최근 10건)\n" +
                        recentConversation.map(e => `[${roleLabel[e.role] ?? e.role}] ${truncateEntry(e.content)}`).join("\n\n")
                      : merged.map(e => `[${roleLabel[e.role] ?? e.role}] ${truncateEntry(e.content)}`).join("\n\n"))
                : "";

            const claudeSystemPrompt = `당신의 이름은 세나입니다.
이 통합관리시스템의 3자 논의에 참여하는 선배 컨설턴트입니다.
노마(데이터 기반 운영 AI)와 사용자가 나누는 대화를 함께 보며 논의에 참여합니다.

당신의 역할:
- 논의의 방향이 올바른지 검토하고 더 나은 방향을 제시
- 노마가 놓쳤거나 간과한 쟁점과 리스크를 지적
- 노마의 분석에 동의하거나 다른 관점에서 반론 제기
- 사용자가 올바른 판단을 내릴 수 있도록 핵심 논점을 정리
- 기술 구현은 방향이 결정된 후 필요시에만 간결하게 언급
- 노마와 사용자 모두를 존중하되, 필요하다면 명확하게 의견 차이를 표현

응답 방식:
- 노마의 응답을 먼저 읽고 그것을 인식하며 시작 (예: "노마가 짚은 것처럼...", "노마의 분석에 한 가지 덧붙이자면...")
- 항상 한국어로, 선배답게 명확하고 간결하게
- 마크다운 형식 사용

## append_unified_entry 사용 기준 (엄격하게 준수)
당신은 대화 중 중요한 내용을 공유 메모에 직접 기록할 수 있습니다.
단, 아래 기준을 반드시 지키세요:

**기록해야 할 때 (role 종류)**
- insight: 여러 대화에 걸쳐 도출된 비자명한 판단. "이 시스템의 핵심 병목은 X다" 같은 수준
- decision: 사용자가 명시적으로 확정한 결정사항. "~로 하기로 했다"가 명확할 때만
- action: 다음 대화에서도 추적해야 할 구체적 실행 항목. 담당자·기한이 있을 때 우선

**절대 기록하지 말아야 할 때**
- 일반적인 대화 내용, 인사, 설명 (이미 sena role로 자동 저장됨)
- 노마나 사용자가 이미 말한 내용의 단순 반복
- 불확실하거나 잠정적인 의견 (확정되지 않은 것은 insight로도 남기지 않음)
- 한 대화에서 2개 이상 기록하는 것은 매우 드문 경우여야 함

## propose_prompt_patch 사용 기준 (매우 엄격하게)
노마의 시스템 프롬프트에 영구적인 행동 지침을 추가하는 도구입니다.

**사용 가능한 경우**
- 여러 대화에서 반복 확인된 노마의 구조적 판단 누락 또는 해석 오류
- 사용자가 "노마 프롬프트에 ~를 추가해줘" 또는 "노마가 항상 ~하도록 해줘"라고 명시적으로 요청한 경우
- 데이터 해석 방식의 근본적 오류 (예: 집계 기준 미명시, 재난-돌봄 연계 미흡)

**절대 사용하지 않는 경우**
- 일회성 코멘트나 이번 대화에서만 필요한 지시
- 이미 노마가 잘 하고 있는 것을 재확인하는 내용
- append_unified_entry로 충분한 내용 (insight/decision/action)
- 한 세션에서 2회 이상 사용하는 것은 극히 드문 경우여야 함

## request_code_task 사용 기준 (매우 엄격하게)
터미널 세나(Claude Code, 로컬 개발 환경)에게 코딩 작업을 요청하는 도구입니다.

**사용 가능한 경우**
- 여러 사용자가 동일하게 보고하거나 반복 확인된 버그
- 사용자가 명시적으로 "코드 수정해줘", "기능 추가해줘"라고 요청한 경우
- 대화 중 발견한 명확한 시스템 결함 (데이터 오류, UI 깨짐 등)

**절대 사용하지 않는 경우**
- 단발성 질문이나 이번 대화에서만 해결 가능한 내용
- 아직 재현되지 않았거나 불확실한 문제
- 대화로 충분히 안내할 수 있는 사용법 문의${unifiedHistoryText}`;

            // 세나 Function Calling tool 정의
            const senaTools: Anthropic.Tool[] = [
                {
                    name: "append_unified_entry",
                    description: "대화 중 도출된 중요한 인사이트·결정·액션을 공유 메모에 직접 기록합니다. 엄격한 기준을 충족할 때만 사용하세요.",
                    input_schema: {
                        type: "object" as const,
                        properties: {
                            role: {
                                type: "string",
                                enum: ["insight", "decision", "action"],
                                description: "insight: 비자명한 핵심 판단 | decision: 사용자가 확정한 결정 | action: 추적 필요한 실행 항목",
                            },
                            content: {
                                type: "string",
                                description: "기록할 내용. 간결하고 명확하게 (2~4문장 이내)",
                            },
                        },
                        required: ["role", "content"],
                    },
                },
                {
                    name: "propose_prompt_patch",
                    description: "노마(NOMA)의 시스템 프롬프트에 새로운 행동 지침을 영구 추가합니다. 여러 대화에 걸쳐 반복 확인된 노마의 판단 누락이나 오류 패턴이 있을 때만 사용하세요. 단순 코멘트나 일회성 제안에는 절대 사용하지 마세요.",
                    input_schema: {
                        type: "object" as const,
                        properties: {
                            title: {
                                type: "string",
                                description: "패치 제목 (예: '재난 데이터 해석 시 수행기관 연계 필수'). 20자 이내로 간결하게.",
                            },
                            content: {
                                type: "string",
                                description: "노마에게 추가할 구체적인 행동 지침. 노마가 즉시 실행 가능한 형태로 작성하세요.",
                            },
                        },
                        required: ["title", "content"],
                    },
                },
                {
                    name: "request_code_task",
                    description: "터미널 세나(Claude Code)에게 코딩 작업을 요청합니다. 여러 사용자가 동일하게 보고하거나 명확한 버그·개선점을 발견했을 때만 사용하세요. 단발성 질문에는 절대 사용하지 마세요.",
                    input_schema: {
                        type: "object" as const,
                        properties: {
                            type: {
                                type: "string",
                                enum: ["bug_fix", "feature_request", "analysis", "question"],
                                description: "bug_fix: 버그 수정 | feature_request: 기능 추가 | analysis: 코드 분석 | question: 기술 질문",
                            },
                            title: {
                                type: "string",
                                description: "작업 제목. 20자 이내로 간결하게.",
                            },
                            description: {
                                type: "string",
                                description: "작업 내용을 구체적으로 설명합니다. 재현 방법, 예상 동작, 실제 동작 등을 포함하세요.",
                            },
                            context: {
                                type: "string",
                                description: "관련 대화 맥락 요약. 어떤 상황에서 이 요청이 나왔는지 설명합니다.",
                            },
                        },
                        required: ["type", "title", "description", "context"],
                    },
                },
            ];

            // 대화 이력 재구성 (Claude 형식)
            const claudeMessages: Anthropic.MessageParam[] = [];
            for (const m of messages.slice(0, -1)) {
                if (m.role === "user") {
                    claudeMessages.push({ role: "user", content: m.content });
                } else if (m.role === "claude") {
                    claudeMessages.push({ role: "assistant", content: m.content });
                }
            }

            // 노마 응답은 unified history에 이미 포함됨 → 1200자로 절단하여 중복 토큰 최소화
            const nomaResponsePreview = nomaFullResponse.length > 1200
                ? nomaFullResponse.slice(0, 1200) + "…(이하 생략, 전문은 대화 이력 참조)"
                : nomaFullResponse;
            claudeMessages.push({
                role: "user",
                content: `사용자 질문: ${lastMessage.content}\n\n노마의 응답:\n${nomaResponsePreview}\n\n위 대화를 보고 선배 컨설턴트로서 의견을 주세요.`,
            });

            const anthropic = new Anthropic({ apiKey: anthropicKey });

            // 세나 응답 (tool_use 처리 포함)
            let senaFullResponse = "";
            let continueLoop = true;
            const loopMessages = [...claudeMessages];

            while (continueLoop) {
                const claudeStream = await anthropic.messages.stream({
                    model: "claude-sonnet-4-6",
                    max_tokens: 2048,
                    system: claudeSystemPrompt,
                    messages: loopMessages,
                    tools: senaTools,
                });

                let currentText = "";
                let toolUseBlocks: Anthropic.ToolUseBlock[] = [];

                for await (const event of claudeStream) {
                    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
                        currentText += event.delta.text;
                        writeChunk("claude", event.delta.text);
                    }
                    if (event.type === "content_block_stop") {
                        // tool_use 블록 수집은 finalMessage에서
                    }
                }

                const finalMsg = await claudeStream.finalMessage();
                senaFullResponse += currentText;

                // tool_use 블록 추출
                toolUseBlocks = finalMsg.content.filter(
                    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
                );

                if (finalMsg.stop_reason === "tool_use" && toolUseBlocks.length > 0) {
                    // 도구 호출 처리
                    const toolResults: Anthropic.ToolResultBlockParam[] = [];
                    for (const toolBlock of toolUseBlocks) {
                        if (toolBlock.name === "append_unified_entry") {
                            const input = toolBlock.input as { role: "insight" | "decision" | "action"; content: string };
                            try {
                                await appendUnified({
                                    role: input.role,
                                    content: input.content,
                                    timestamp: new Date().toISOString(),
                                });
                                toolResults.push({ type: "tool_result", tool_use_id: toolBlock.id, content: "저장 완료" });
                            } catch (e) {
                                toolResults.push({ type: "tool_result", tool_use_id: toolBlock.id, content: "저장 실패", is_error: true });
                            }
                        } else if (toolBlock.name === "propose_prompt_patch") {
                            const input = toolBlock.input as { title: string; content: string };
                            try {
                                const patch = await appendPromptPatch({
                                    title: input.title,
                                    content: input.content,
                                    proposedBy: "sena",
                                    timestamp: new Date().toISOString(),
                                });
                                console.log(`[PromptPatch] 세나가 새 패치 제안: "${patch.title}"`);
                                toolResults.push({ type: "tool_result", tool_use_id: toolBlock.id, content: `패치 저장 완료 (id: ${patch.id})` });
                            } catch (e) {
                                toolResults.push({ type: "tool_result", tool_use_id: toolBlock.id, content: "패치 저장 실패", is_error: true });
                            }
                        } else if (toolBlock.name === "request_code_task") {
                            const input = toolBlock.input as {
                                type: "bug_fix" | "feature_request" | "analysis" | "question";
                                title: string;
                                description: string;
                                context: string;
                            };
                            try {
                                const task = await appendCodeTask({
                                    type: input.type,
                                    title: input.title,
                                    description: input.description,
                                    context: input.context,
                                    status: "pending",
                                    proposedBy: "sena",
                                    timestamp: new Date().toISOString(),
                                });
                                console.log(`[CodeTask] 세나가 새 코드 작업 요청: "${task.title}"`);
                                toolResults.push({ type: "tool_result", tool_use_id: toolBlock.id, content: `작업 요청 저장 완료 (id: ${task.id})` });
                            } catch (e) {
                                toolResults.push({ type: "tool_result", tool_use_id: toolBlock.id, content: "작업 저장 실패", is_error: true });
                            }
                        }
                    }
                    // 다음 루프를 위해 메시지 추가
                    loopMessages.push({ role: "assistant", content: finalMsg.content });
                    loopMessages.push({ role: "user", content: toolResults });
                } else {
                    continueLoop = false;
                }
            }

            // 세나 응답 → unified session 저장
            if (senaFullResponse) {
                await appendUnified({ role: "sena", content: senaFullResponse, timestamp: new Date().toISOString() });
            }

            res.write(`data: [DONE]\n\n`);
            res.end();
        } catch (err: any) {
            console.error("[Triple Chat] 오류:", err.message);
            if (!res.headersSent) {
                res.status(500).json({ error: err.message });
            } else {
                res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
                res.end();
            }
        }
    });

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

    // Firebase 초기화 후 unified session, 패치, 지식 로드
    setTimeout(() => {
        loadUnifiedSession().catch((err) =>
            console.error("[UnifiedSession] 초기 로드 실패:", err)
        );
        loadPromptPatches().catch((err) =>
            console.error("[PromptPatches] 초기 로드 실패:", err)
        );
        loadCodeTasks().catch((err) =>
            console.error("[CodeTasks] 초기 로드 실패:", err)
        );
        loadFromLocalFile();
        reindexMissingEmbeddings().catch(err =>
            console.error("[QnA] 초기 인덱싱 실패:", err)
        );
    }, 2000);

    return app;
}
