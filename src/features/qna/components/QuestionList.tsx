import { Clock, CheckCircle, BotMessageSquare, CircleDot } from "lucide-react";
import type { Question, QuestionStatus } from "@/features/qna/lib/types";
import { STATUS_LABELS } from "@/features/qna/lib/types";

interface QuestionListProps {
    questions: Question[];
    loading: boolean;
    onSelect: (question: Question) => void;
    selectedId?: string;
    statusFilter: QuestionStatus | "all";
    onStatusFilterChange: (status: QuestionStatus | "all") => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    isAdmin?: boolean;
}

const STATUS_ICON: Record<QuestionStatus, React.ReactNode> = {
    pending: <Clock className="h-3.5 w-3.5 text-yellow-500" />,
    ai_draft: <BotMessageSquare className="h-3.5 w-3.5 text-blue-500" />,
    answered: <CheckCircle className="h-3.5 w-3.5 text-green-500" />,
    closed: <CircleDot className="h-3.5 w-3.5 text-gray-400" />,
};

const STATUS_BADGE_VARIANT: Record<QuestionStatus, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    ai_draft: "bg-blue-100 text-blue-700",
    answered: "bg-green-100 text-green-700",
    closed: "bg-gray-100 text-gray-500",
};

export default function QuestionList({
    questions,
    loading,
    onSelect,
    selectedId,
    statusFilter,
    onStatusFilterChange,
    searchQuery,
    onSearchChange,
    isAdmin = false,
}: QuestionListProps) {
    const filtered = questions.filter((q) => {
        if (statusFilter !== "all" && q.status !== statusFilter) return false;
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (
                q.title.toLowerCase().includes(query) ||
                q.content.toLowerCase().includes(query) ||
                q.authorOrgName.toLowerCase().includes(query)
            );
        }
        return true;
    });

    // Helper to mask status for non-admins
    const getDisplayStatus = (status: QuestionStatus): QuestionStatus => {
        if (!isAdmin && status === "ai_draft") return "pending";
        return status;
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Filters */}
            <div className="p-3 border-b border-gray-100 space-y-2">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="질문 검색..."
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <div className="flex gap-1 flex-wrap">
                    {(["all", "pending", "ai_draft", "answered", "closed"] as const)
                        .filter(s => isAdmin || s !== "ai_draft") // Hide 'ai_draft' filter for non-admins
                        .map((s) => (
                            <button
                                key={s}
                                onClick={() => onStatusFilterChange(s)}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${statusFilter === s
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                    }`}
                            >
                                {s === "all" ? "전체" : STATUS_LABELS[s]}
                            </button>
                        ))}
                </div>
            </div>

            {/* List */}
            <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
                {loading ? (
                    <div className="p-6 text-center text-gray-400 text-sm">
                        로딩 중...
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="p-6 text-center text-gray-400 text-sm">
                        질문이 없습니다
                    </div>
                ) : (
                    filtered.map((q) => {
                        const displayStatus = getDisplayStatus(q.status);
                        return (
                            <button
                                key={q.id}
                                onClick={() => onSelect(q)}
                                className={`w-full text-left p-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${selectedId === q.id
                                    ? "bg-emerald-50 border-l-2 border-l-emerald-500"
                                    : ""
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            {STATUS_ICON[displayStatus]}
                                            <span className="text-sm font-medium text-gray-900 truncate">
                                                {q.title}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 truncate">{q.content}</p>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <span className="text-xs text-gray-400">
                                                {q.authorOrgName} · {q.authorName}
                                            </span>
                                            <span
                                                className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_BADGE_VARIANT[displayStatus]}`}
                                            >
                                                {STATUS_LABELS[displayStatus]}
                                            </span>
                                            <span className="inline-flex px-1.5 py-0.5 rounded border border-gray-200 text-xs text-gray-600">
                                                {q.category}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
}
