import { useState } from "react";
import {
    BotMessageSquare,
    Clock,
    CheckCircle,
} from "lucide-react";
import type { Question, OfficialDocument } from "@/features/qna/lib/types";
import { STATUS_LABELS } from "@/features/qna/lib/types";
import AdminAnswerEditor from "@/features/qna/components/AdminAnswerEditor";
import QuestionDetail from "@/features/qna/components/QuestionDetail";

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

type AdminView = "list" | "edit" | "detail";

export default function AdminPanel({
    questions,
    documents,
    loading,
    adminName,
    onApprove,
    onClose,
    onDelete,
}: AdminPanelProps) {
    const [view, setView] = useState<AdminView>("list");
    const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(
        null
    );
    const [statusFilter, setStatusFilter] = useState<string>("all");

    const filtered =
        statusFilter === "all"
            ? questions
            : questions.filter((q) => q.status === statusFilter);

    const pendingCount = questions.filter((q) => q.status === "pending").length;
    const draftCount = questions.filter((q) => q.status === "ai_draft").length;
    const answeredCount = questions.filter(
        (q) => q.status === "answered"
    ).length;

    const getRelatedDoc = (q: Question) =>
        q.relatedDocumentId
            ? documents.find((d) => d.id === q.relatedDocumentId) ?? null
            : null;

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

    return (
        <div className="space-y-4">
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
