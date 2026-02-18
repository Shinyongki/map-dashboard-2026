import { useState } from "react";
import { Send, X } from "lucide-react";
import type { OfficialDocument, QuestionCategory } from "@/features/qna/lib/types";
import { QUESTION_CATEGORIES } from "@/features/qna/lib/types";

interface QuestionFormProps {
    documents: OfficialDocument[];
    authorName: string;
    authorOrg: string;
    authorOrgName: string;
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
    onSubmit,
    onCancel,
}: QuestionFormProps) {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [category, setCategory] = useState<QuestionCategory>("사업지침");
    const [relatedDocumentId, setRelatedDocumentId] = useState("");
    const [isPublic, setIsPublic] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

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
        </div>
    );
}
