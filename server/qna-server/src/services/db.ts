
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Type definitions
export interface Question {
    id: string;
    title: string;
    content: string;
    authorName: string;
    authorOrg: string;
    authorOrgName: string;
    category: string;
    status: "pending" | "ai_draft" | "answered" | "closed";
    createdAt: string;
    updatedAt: string;
    answer?: string;
    answerAuthor?: string;
    relatedDocumentId?: string;
}

export interface ResourceRequest {
    id: string;
    name: string;
    category: string;
    group: string;
    address: string;
    contact: string;
    description: string;
    status: "pending" | "approved" | "rejected";
    submittedAt: string;
    approvedAt?: string;
}

export interface Notice {
    id: string;
    content: string;
    isActive: boolean;
    category: "general" | "urgent" | "exception";
    relatedDocumentId?: string;
    createdAt: string;
    updatedAt: string;
}

export interface OfficialDocument {
    id: string;
    title: string;
    content: string;
    category: string;
    managerName: string;
    managerPhone: string;
    uploadedAt: string;
}

interface Database {
    questions: Question[];
    resources: ResourceRequest[];
    notices: Notice[];
    documents: OfficialDocument[];
}

const DB_PATH = path.resolve(__dirname, "../../data/db.json");

// Initialize default DB
const defaultDB: Database = {
    questions: [],
    resources: [],
    documents: [
        {
            id: "doc-001",
            title: "2026년도 노인맞춤돌봄서비스 사업안내",
            content: "사업안내서 본문입니다...",
            category: "지침",
            managerName: "김지방",
            managerPhone: "051-123-4567",
            uploadedAt: new Date().toISOString()
        }
    ],
    notices: [
        {
            id: "notice-001",
            content: "인수증 제출 기한은 원칙적으로 당일이나, 천재지변 등 불가피한 사유 발생 시 최대 7일까지 연장 가능합니다.",
            isActive: true,
            category: "exception",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    ],
};

class LocalDB {
    private data: Database;

    constructor() {
        this.data = this.load();
        // Ensure all arrays exist
        if (!this.data.documents) {
            this.data.documents = defaultDB.documents;
        }
        if (!this.data.notices) {
            this.data.notices = defaultDB.notices;
        }
        if (!this.data.resources) {
            this.data.resources = [];
        }
        this.save();
    }

    private load(): Database {
        if (!fs.existsSync(DB_PATH)) {
            this.save(defaultDB);
            return defaultDB;
        }
        try {
            const raw = fs.readFileSync(DB_PATH, "utf-8");
            const parsed = JSON.parse(raw);
            return parsed;
        } catch (error) {
            console.error("Failed to load DB, resetting to default:", error);
            return defaultDB;
        }
    }

    private save(data: Database = this.data) {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
    }

    // --- Questions ---
    getQuestions() {
        return this.data.questions;
    }

    addQuestion(q: Omit<Question, "id" | "createdAt" | "updatedAt" | "status">) {
        const newQuestion: Question = {
            ...q,
            id: uuidv4(),
            status: "pending",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        this.data.questions.unshift(newQuestion);
        this.save();
        return newQuestion;
    }

    updateQuestion(id: string, updates: Partial<Question>) {
        const idx = this.data.questions.findIndex((q) => q.id === id);
        if (idx === -1) return null;

        this.data.questions[idx] = {
            ...this.data.questions[idx],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        this.save();
        return this.data.questions[idx];
    }

    deleteQuestion(id: string) {
        const initialLength = this.data.questions.length;
        this.data.questions = this.data.questions.filter((q) => q.id !== id);
        if (this.data.questions.length !== initialLength) {
            this.save();
            return true;
        }
        return false;
    }

    // --- Notices ---
    getNotices() {
        return this.data.notices;
    }

    addNotice(n: Omit<Notice, "id" | "createdAt" | "updatedAt">) {
        const newNotice: Notice = {
            ...n,
            id: uuidv4(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        this.data.notices.unshift(newNotice);
        this.save();
        return newNotice;
    }

    updateNotice(id: string, updates: Partial<Notice>) {
        const idx = this.data.notices.findIndex(n => n.id === id);
        if (idx === -1) return null;

        this.data.notices[idx] = {
            ...this.data.notices[idx],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        this.save();
        return this.data.notices[idx];
    }

    // --- Resources ---
    getResources() {
        return this.data.resources;
    }

    addResource(r: Omit<ResourceRequest, "id" | "submittedAt" | "status">) {
        const newResource: ResourceRequest = {
            ...r,
            id: uuidv4(),
            status: "pending",
            submittedAt: new Date().toISOString()
        };
        this.data.resources.push(newResource);
        this.save();
        return newResource;
    }

    // --- Documents ---
    getDocuments() {
        return this.data.documents;
    }
}

export const db = new LocalDB();

