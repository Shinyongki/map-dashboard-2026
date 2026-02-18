import { useState } from "react";
import {
    ArrowLeft,
    BotMessageSquare,
    CheckCircle,
    FileText,
} from "lucide-react";
import type { Question, OfficialDocument } from "@/features/qna/lib/types";

interface AdminAnswerEditorProps {
    question: Question;
    relatedDocument?: OfficialDocument | null;
    adminName: string;
    onApprove: (
        questionId: string,
        finalAnswer: string,
        answeredBy: string
    ) => Promise<void>;
    onBack: () => void;
}

export default function AdminAnswerEditor({
    question,
    relatedDocument,
    adminName,
    onApprove,
    onBack,
}: AdminAnswerEditorProps) {
    const [answer, setAnswer] = useState(question.aiDraftAnswer || "");
    const [submitting, setSubmitting] = useState(false);

    const handleApprove = async () => {
        if (!answer.trim()) return;
        setSubmitting(true);
        try {
            await onApprove(question.id, answer.trim(), adminName);
            onBack();
        } catch (err) {
            console.error("승인 실패:", err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleUseAiDraft = () => {
        if (question.aiDraftAnswer) {
            setAnswer(question.aiDraftAnswer);
        }
    };

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
                <h3 className="text-lg font-bold text-gray-900">답변 검토/승인</h3>
            </div>

            {/* Question info */}
            <div className="p-4 bg-gray-50 rounded-lg mb-4">
                <div className="flex items-center gap-2 mb-2">
                    <span className="px-1.5 py-0.5 rounded border border-gray-200 text-xs text-gray-600">
                        {question.category}
                    </span>
                    <span className="text-sm text-gray-500">
                        {question.authorOrgName} · {question.authorName}
                    </span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">{question.title}</h4>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {question.content}
                </p>
            </div>

            {/* Related document */}
            {relatedDocument && (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg mb-4 text-sm">
                    <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-600">
                        [{relatedDocument.documentNumber}] {relatedDocument.title}
                    </span>
                </div>
            )}

            {/* AI Draft reference */}
            {question.aiDraftAnswer && (
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <BotMessageSquare className="h-4 w-4 text-blue-500" />
                            <h4 className="text-sm font-semibold text-blue-700">AI 초안</h4>
                        </div>
                        <button
                            onClick={handleUseAiDraft}
                            className="px-3 py-1 border border-gray-300 rounded-lg text-xs text-gray-700 hover:bg-gray-50"
                        >
                            AI 초안 사용
                        </button>
                    </div>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {question.aiDraftAnswer}
                    </div>
                </div>
            )}

            {/* Answer editor */}
            <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    최종 답변 작성
                </h4>
                <textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    rows={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                    placeholder="최종 답변을 작성하세요. AI 초안을 수정하거나 새로 작성할 수 있습니다."
                />
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end">
                <button
                    onClick={onBack}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                    취소
                </button>
                <button
                    onClick={handleApprove}
                    disabled={submitting || !answer.trim()}
                    className="flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                    {submitting ? (
                        "승인 중..."
                    ) : (
                        <>
                            <CheckCircle className="h-4 w-4" />
                            답변 승인 및 전달
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
