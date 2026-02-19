import { useState } from "react";
import { Send, X, AlertCircle, Phone, User as UserIcon, HelpCircle, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { useQuestions } from "@/features/qna/hooks/useQuestions";
import type { OfficialDocument, QuestionCategory } from "@/features/qna/lib/types";
import { QUESTION_CATEGORIES } from "@/features/qna/lib/types";
import { useNotices } from "@/features/qna/hooks/useNotices";

interface QuestionFormProps {
    documents: OfficialDocument[];
    authorName: string;
    authorOrg: string;
    authorOrgName: string;
    defaultDocumentId?: string | null;
    onSubmit: (data: {
        title: string;
        content: string;
        category: QuestionCategory;
        relatedDocumentId?: string;
        authorName: string;
        authorOrg: string;
        authorOrgName: string;
        isPublic: boolean;
    }) => Promise<void>;
    onCancel: () => void;
}

export default function QuestionForm({
    documents,
    authorName,
    authorOrg,
    authorOrgName,
    defaultDocumentId,
    onSubmit,
    onCancel,
}: QuestionFormProps) {
    const { notices } = useNotices();

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [category, setCategory] = useState<QuestionCategory>("사업지침");
    const [relatedDocumentId, setRelatedDocumentId] = useState(defaultDocumentId || "");
    const [isPublic, setIsPublic] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [showRelatedQuestions, setShowRelatedQuestions] = useState(true);

    // Fetch questions related to the selected document
    const { questions: relatedQuestions, loading: loadingQuestions } = useQuestions(
        relatedDocumentId ? { relatedDocumentId } : undefined
    );

    // Filter notices: Show active notices.
    // If a specific document is selected (via defaultDocumentId), show ONLY notices related to that document.
    // Otherwise, show general/urgent notices OR those related to the selected document.
    const relevantNotices = notices.filter(n =>
        n.isActive && (
            defaultDocumentId
                ? n.relatedDocumentId === defaultDocumentId
                : (
                    n.category !== "general" || // Always show urgent/exception
                    n.relatedDocumentId === relatedDocumentId || // Show if related to selected doc
                    (!n.relatedDocumentId && !relatedDocumentId) // Show general notices if no doc selected
                )
        )
    );

    const selectedDoc = documents.find(d => d.id === relatedDocumentId);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) {
            setError("제목과 내용을 입력해주세요.");
            return;
        }
        setSubmitting(true);
        setError("");
        try {
            await onSubmit({
                title: title.trim(),
                content: content.trim(),
                category,
                relatedDocumentId: relatedDocumentId || undefined,
                authorName,
                authorOrg,
                authorOrgName,
                isPublic,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : "질문 등록 실패");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Notice Banner */}
            {/* Relevant Notices Banner */}
            {relevantNotices.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="space-y-2">
                            <h4 className="text-sm font-bold text-amber-800">
                                {selectedDoc ? "관련 공지사항" : "주요 공지사항"}
                            </h4>
                            <ul className="space-y-1">
                                {relevantNotices.map((notice) => (
                                    <li key={notice.id} className="text-sm text-amber-700 flex items-start gap-1.5">
                                        <span className="mt-1.5 w-1 h-1 rounded-full bg-amber-400 flex-shrink-0" />
                                        <span>
                                            {notice.category === "exception" && <span className="font-bold text-amber-900">[예외] </span>}
                                            {notice.category === "urgent" && <span className="font-bold text-red-600">[긴급] </span>}
                                            {notice.content}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">질문 작성</h3>
                    <button
                        onClick={onCancel}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Only show Category and Related Document selectors if NOT in a specific document context */}
                    {!defaultDocumentId && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    카테고리
                                </label>
                                <select
                                    value={category}
                                    onChange={(e) =>
                                        setCategory(e.target.value as QuestionCategory)
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                >
                                    {QUESTION_CATEGORIES.map((c) => (
                                        <option key={c} value={c}>
                                            {c}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    관련 공문
                                </label>
                                <select
                                    value={relatedDocumentId}
                                    onChange={(e) => setRelatedDocumentId(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                >
                                    <option value="">선택 안함</option>
                                    {documents.map((doc) => (
                                        <option key={doc.id} value={doc.id}>
                                            [{doc.documentNumber}] {doc.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* If defaultDocumentId is present, we might want to show which document this is for, or just rely on the context */}
                    {selectedDoc && (
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex flex-col gap-1 text-sm text-blue-800">
                            <div className="text-xs font-semibold text-blue-600 mb-1">문의 대상 공문</div>
                            <div className="font-bold text-blue-900">[{selectedDoc.documentNumber}] {selectedDoc.title}</div>
                            <div className="flex items-center gap-1.5 mt-1">
                                <UserIcon className="h-3.5 w-3.5 text-blue-600" />
                                <span className="font-semibold text-xs">담당자:</span>
                                <span className="text-xs">{selectedDoc.managerName || "정보 없음"}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Phone className="h-3.5 w-3.5 text-blue-600" />
                                <span className="font-semibold text-xs">문의:</span>
                                <span className="text-xs">{selectedDoc.managerPhone || "정보 없음"}</span>
                            </div>
                        </div>
                    )}

                    {/* Related Questions (Q&A) */}
                    {relatedDocumentId && (
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setShowRelatedQuestions(!showRelatedQuestions)}
                                className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700 transition-colors"
                            >
                                <span className="flex items-center gap-2">
                                    <HelpCircle className="h-4 w-4 text-gray-500" />
                                    이 문서와 관련된 다른 질문들 ({relatedQuestions.length})
                                </span>
                                {showRelatedQuestions ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                            </button>

                            {showRelatedQuestions && (
                                <div className="p-3 bg-white space-y-2 max-h-60 overflow-y-auto border-t border-gray-200">
                                    {loadingQuestions ? (
                                        <p className="text-center text-xs text-gray-500 py-2">로딩 중...</p>
                                    ) : relatedQuestions.length === 0 ? (
                                        <p className="text-center text-xs text-gray-500 py-2">아직 등록된 질문이 없습니다.</p>
                                    ) : (
                                        relatedQuestions.map(q => (
                                            <div key={q.id} className="p-2.5 border border-gray-100 rounded-lg hover:bg-gray-50 text-sm transition-colors cursor-default">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${q.status === "answered"
                                                        ? "bg-green-100 text-green-700"
                                                        : q.status === "closed"
                                                            ? "bg-gray-100 text-gray-600 line-through"
                                                            : "bg-yellow-100 text-yellow-700"
                                                        }`}>
                                                        {q.status === "answered" ? "답변완료" : q.status === "closed" ? "종료" : "대기중"}
                                                    </span>
                                                    <span className="text-gray-900 font-medium truncate">{q.title}</span>
                                                </div>
                                                {
                                                    q.finalAnswer && (
                                                        <div className="flex gap-2 pl-1">
                                                            <div className="min-w-[12px] pt-0.5">
                                                                <div className="w-0.5 h-full bg-emerald-200 mx-auto rounded-full"></div>
                                                            </div>
                                                            <p className="text-xs text-gray-600 line-clamp-2">
                                                                {q.finalAnswer}
                                                            </p>
                                                        </div>
                                                    )
                                                }
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            제목
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="질문 제목을 입력하세요"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            질문 내용
                        </label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="질문 내용을 자세히 입력해주세요"
                            rows={6}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="isPublic"
                            checked={isPublic}
                            onChange={(e) => setIsPublic(e.target.checked)}
                            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <label htmlFor="isPublic" className="text-sm text-gray-600">
                            다른 사용자에게도 공개 (같은 궁금증을 가진 분들에게 도움이 됩니다)
                        </label>
                    </div>

                    {error && <p className="text-sm text-red-600">{error}</p>}

                    <div className="flex gap-2 justify-end">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                        >
                            {submitting ? (
                                "등록 중..."
                            ) : (
                                <>
                                    <Send className="h-4 w-4" />
                                    질문 등록
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div >
        </div >
    );
}
