import {
    ArrowLeft,
    BotMessageSquare,
    CheckCircle,
    Clock,
    FileText,
} from "lucide-react";
import type { Question, OfficialDocument } from "@/features/qna/lib/types";
import { STATUS_LABELS } from "@/features/qna/lib/types";

interface QuestionDetailProps {
    question: Question;
    relatedDocument?: OfficialDocument | null;
    isAdmin: boolean;
    onBack: () => void;
    onEdit?: (question: Question) => void;
}

export default function QuestionDetail({
    question,
    relatedDocument,
    isAdmin,
    onBack,
    onEdit,
}: QuestionDetailProps) {
    const showAnswer =
        question.status === "answered" || question.status === "closed";
    const showAiDraft = isAdmin && question.aiDraftAnswer;

    // Mask AI draft status for non-admins
    const displayStatus = !isAdmin && question.status === "ai_draft" ? "pending" : question.status;

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <button
                    onClick={onBack}
                    className="text-gray-400 hover:text-gray-600"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <h3 className="text-lg font-bold text-gray-900 flex-1">
                    {question.title}
                </h3>
                {isAdmin && question.status === "ai_draft" && onEdit && (
                    <button
                        onClick={() => onEdit(question)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium"
                    >
                        답변 검토/승인
                    </button>
                )}
            </div>

            {/* Meta */}
            <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
                <span className="px-1.5 py-0.5 rounded border border-gray-200 text-xs text-gray-600">
                    {question.category}
                </span>
                <span>
                    {question.authorOrgName} · {question.authorName}
                </span>
                <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${displayStatus === "answered"
                        ? "bg-green-100 text-green-700"
                        : displayStatus === "ai_draft"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                >
                    {STATUS_LABELS[displayStatus]}
                </span>
            </div>

            {/* Related document */}
            {relatedDocument && (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg mb-4 text-sm">
                    <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-600">
                        관련 공문: [{relatedDocument.documentNumber}]{" "}
                        {relatedDocument.title}
                    </span>
                </div>
            )}

            {/* Question content */}
            <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">질문 내용</h4>
                <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">
                    {question.content}
                </div>
            </div>

            {/* Final Answer */}
            {showAnswer && question.finalAnswer && (
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <h4 className="text-sm font-semibold text-green-700">최종 답변</h4>
                        {question.answeredBy && (
                            <span className="text-xs text-gray-400">
                                답변: {question.answeredBy}
                            </span>
                        )}
                    </div>
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">
                        {question.finalAnswer}
                    </div>
                </div>
            )}

            {/* AI Draft (admin only) */}
            {showAiDraft && !showAnswer && (
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <BotMessageSquare className="h-4 w-4 text-blue-500" />
                        <h4 className="text-sm font-semibold text-blue-700">
                            AI 초안 (관리자만 표시)
                        </h4>
                    </div>
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">
                        {question.aiDraftAnswer}
                    </div>
                </div>
            )}

            {/* Pending state - Only visible to Admin */}
            {displayStatus === "pending" && isAdmin && (
                <div className="flex items-center gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                    <BotMessageSquare className="h-4 w-4 animate-pulse" />
                    <span>AI가 답변 초안을 생성하고 있습니다...</span>
                </div>
            )}
        </div>
    );
}
