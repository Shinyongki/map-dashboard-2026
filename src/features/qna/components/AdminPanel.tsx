import { useState } from "react";
import {
    BotMessageSquare,
    Clock,
    CheckCircle,
    Megaphone,
    ArrowLeft,
    FileText,
} from "lucide-react";
import type { Question, OfficialDocument } from "@/features/qna/lib/types";
import { STATUS_LABELS } from "@/features/qna/lib/types";
import AdminAnswerEditor from "@/features/qna/components/AdminAnswerEditor";
import QuestionDetail from "@/features/qna/components/QuestionDetail";
import NoticeManager from "@/features/qna/components/NoticeManager";
import DocumentGrid from "@/features/qna/components/DocumentGrid";
import KnowledgeManager from "@/features/qna/components/KnowledgeManager";

interface AdminPanelProps {
    questions: Question[];
    documents: OfficialDocument[];
    loading: boolean;
    adminName: string;
    onApprove: (
        questionId: string,
        finalAnswer: string,
        answeredBy: string
    ) => Promise<void>;
    onClose: (questionId: string) => Promise<void>;
    onDelete: (questionId: string) => Promise<void>;
}

type AdminView = "documents" | "list" | "edit" | "detail" | "notices" | "knowledge";

export default function AdminPanel({
    questions,
    documents,
    loading,
    adminName,
    onApprove,
    onClose,
    onDelete,
}: AdminPanelProps) {
    const [view, setView] = useState<AdminView>("documents");
    const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
    const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>("all");

    // Filter by Document + Status
    const filtered = questions.filter((q) => {
        const matchDoc = selectedDocId ? q.relatedDocumentId === selectedDocId : !q.relatedDocumentId;
        const matchStatus = statusFilter === "all" || q.status === statusFilter;
        return matchDoc && matchStatus;
    });

    const pendingCount = filtered.filter((q) => q.status === "pending").length;
    const draftCount = filtered.filter((q) => q.status === "ai_draft").length;
    const answeredCount = filtered.filter((q) => q.status === "answered").length;

    const selectedDoc = documents.find(d => d.id === selectedDocId);

    const getRelatedDoc = (q: Question) =>
        q.relatedDocumentId
            ? documents.find((d) => d.id === q.relatedDocumentId) ?? null
            : null;

    if (view === "documents") {
        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3 flex-1 mr-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="text-blue-900 font-bold text-sm">공문별 질문 관리</h3>
                            <p className="text-blue-700 text-xs mt-1">
                                관리할 공문을 선택하세요. 선택된 공문의 질문만 필터링하여 관리할 수 있습니다.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setView("notices")}
                        className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center hover:bg-purple-100 transition-colors h-full flex flex-col items-center justify-center min-w-[120px]"
                    >
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <Megaphone className="h-5 w-5 text-purple-500" />
                            <span className="text-sm font-medium text-purple-700">공지관리</span>
                        </div>
                    </button>
                    <button
                        onClick={() => setView("knowledge")}
                        className="bg-teal-50 border border-teal-200 rounded-lg p-4 text-center hover:bg-teal-100 transition-colors h-full flex flex-col items-center justify-center min-w-[120px]"
                    >
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <FileText className="h-5 w-5 text-teal-500" />
                            <span className="text-sm font-medium text-teal-700">지식관리</span>
                        </div>
                    </button>
                </div>

                <DocumentGrid
                    documents={documents}
                    questions={questions}
                    onSelect={(docId) => {
                        setSelectedDocId(docId);
                        setView("list");
                    }}
                    isAdmin={true}
                />
            </div>
        );
    }

    if (view === "edit" && selectedQuestion) {
        return (
            <AdminAnswerEditor
                question={selectedQuestion}
                relatedDocument={getRelatedDoc(selectedQuestion)}
                adminName={adminName}
                onApprove={onApprove}
                onBack={() => {
                    setView("list");
                    setSelectedQuestion(null);
                }}
            />
        );
    }

    if (view === "detail" && selectedQuestion) {
        return (
            <QuestionDetail
                question={selectedQuestion}
                relatedDocument={getRelatedDoc(selectedQuestion)}
                isAdmin={true}
                onBack={() => {
                    setView("list");
                    setSelectedQuestion(null);
                }}
                onEdit={(q) => {
                    setSelectedQuestion(q);
                    setView("edit");
                }}
            />
        );
    }

    if (view === "knowledge") {
        return (
            <div className="space-y-4">
                <button
                    onClick={() => setView("documents")}
                    className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1"
                >
                    <ArrowLeft className="h-4 w-4" /> 목록으로 돌아가기
                </button>
                <KnowledgeManager />
            </div>
        );
    }

    if (view === "notices") {
        return (
            <div className="space-y-4">
                <button
                    onClick={() => setView("documents")}
                    className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1"
                >
                    <ArrowLeft className="h-4 w-4" /> 목록으로 돌아가기
                </button>
                <NoticeManager />
            </div>
        );
    }

    // List View
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <button
                    onClick={() => setView("documents")}
                    className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <h2 className="text-lg font-bold text-gray-900">
                    {selectedDoc ? selectedDoc.title : "일반 질의응답"} 관리
                </h2>
                {selectedDoc && (
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        {selectedDoc.documentNumber}
                    </span>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                        <Clock className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm font-medium text-yellow-700">대기중</span>
                    </div>
                    <span className="text-2xl font-bold text-yellow-600">
                        {pendingCount}
                    </span>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                        <BotMessageSquare className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium text-blue-700">
                            AI 초안 검토
                        </span>
                    </div>
                    <span className="text-2xl font-bold text-blue-600">
                        {draftCount}
                    </span>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium text-green-700">
                            답변완료
                        </span>
                    </div>
                    <span className="text-2xl font-bold text-green-600">
                        {answeredCount}
                    </span>
                </div>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1 flex-wrap">
                {[
                    { key: "all", label: "전체" },
                    { key: "pending", label: "대기중" },
                    { key: "ai_draft", label: "AI 초안" },
                    { key: "answered", label: "답변완료" },
                    { key: "closed", label: "종료" },
                ].map((f) => (
                    <button
                        key={f.key}
                        onClick={() => setStatusFilter(f.key)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${statusFilter === f.key
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Question list */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-6 text-center text-gray-400 text-sm">
                        로딩 중...
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="p-6 text-center text-gray-400 text-sm">
                        해당하는 질문이 없습니다
                    </div>
                ) : (
                    filtered.map((q) => (
                        <div
                            key={q.id}
                            className="p-3 border-b border-gray-50 hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <button
                                    className="flex-1 text-left"
                                    onClick={() => {
                                        setSelectedQuestion(q);
                                        setView("detail");
                                    }}
                                >
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <span className="text-sm font-medium text-gray-900">
                                            {q.title}
                                        </span>
                                        <span className="inline-flex px-1.5 py-0.5 rounded border border-gray-200 text-xs text-gray-600">
                                            {q.category}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 truncate mb-1">
                                        {q.content}
                                    </p>
                                    <span className="text-xs text-gray-400">
                                        {q.authorOrgName} · {q.authorName}
                                    </span>
                                </button>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <span
                                        className={`px-2 py-1 rounded text-xs font-medium ${q.status === "ai_draft"
                                            ? "bg-blue-100 text-blue-700"
                                            : q.status === "answered"
                                                ? "bg-green-100 text-green-700"
                                                : q.status === "pending"
                                                    ? "bg-yellow-100 text-yellow-700"
                                                    : "bg-gray-100 text-gray-500"
                                            }`}
                                    >
                                        {STATUS_LABELS[q.status]}
                                    </span>

                                    {q.status === "ai_draft" && (
                                        <button
                                            onClick={() => {
                                                setSelectedQuestion(q);
                                                setView("edit");
                                            }}
                                            className="px-2.5 py-1 bg-emerald-600 text-white text-xs rounded-md hover:bg-emerald-700 transition-colors"
                                        >
                                            검토
                                        </button>
                                    )}

                                    {q.status === "answered" && (
                                        <button
                                            onClick={() => onClose(q.id)}
                                            className="px-2.5 py-1 bg-gray-500 text-white text-xs rounded-md hover:bg-gray-600 transition-colors"
                                        >
                                            종료
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
