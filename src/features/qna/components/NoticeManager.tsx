
import { useState } from "react";
import { Plus, X, Megaphone, Check, AlertCircle } from "lucide-react";
import { useNotices } from "@/features/qna/hooks/useNotices";
import { Notice } from "@/features/qna/lib/types";
import { useDocuments } from "@/features/qna/hooks/useDocuments";

export default function NoticeManager() {
    const { notices, addNotice, updateNotice, loading } = useNotices();
    const { documents } = useDocuments();
    const [isAdding, setIsAdding] = useState(false);
    const [newContent, setNewContent] = useState("");
    const [newCategory, setNewCategory] = useState<Notice["category"]>("general");
    const [newRelatedDocId, setNewRelatedDocId] = useState<string>("");

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newContent.trim()) return;

        const success = await addNotice(newContent, newCategory, true, newRelatedDocId || undefined);
        if (success) {
            setNewContent("");
            setNewCategory("general");
            setNewRelatedDocId("");
            setIsAdding(false);
        }
    };

    const toggleActive = async (notice: Notice) => {
        await updateNotice(notice.id, { isActive: !notice.isActive });
    };

    const getDocumentTitle = (docId?: string) => {
        if (!docId) return null;
        return documents.find(d => d.id === docId)?.title || "삭제된 문서";
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-gray-600" />
                    공지사항 관리
                </h3>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800"
                >
                    {isAdding ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {isAdding ? "취소" : "공지 등록"}
                </button>
            </div>

            {isAdding && (
                <form onSubmit={handleAdd} className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                            공지 내용
                        </label>
                        <textarea
                            value={newContent}
                            onChange={(e) => setNewContent(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                            rows={2}
                            placeholder="예: 인수증 제출 기한이 7일 연장되었습니다."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                관련 문서 (선택)
                            </label>
                            <select
                                value={newRelatedDocId}
                                onChange={(e) => setNewRelatedDocId(e.target.value)}
                                className="w-full text-sm border border-gray-300 rounded px-2 py-1.5"
                            >
                                <option value="">관련 문서 없음</option>
                                {documents.map(doc => (
                                    <option key={doc.id} value={doc.id}>
                                        {doc.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                유형
                            </label>
                            <select
                                value={newCategory}
                                onChange={(e) => setNewCategory(e.target.value as any)}
                                className="w-full text-sm border border-gray-300 rounded px-2 py-1.5"
                            >
                                <option value="general">일반</option>
                                <option value="urgent">긴급</option>
                                <option value="exception">예외규정</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            className="px-4 py-1.5 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700"
                        >
                            등록
                        </button>
                    </div>
                </form>
            )}

            <div className="space-y-2">
                {loading ? (
                    <p className="text-sm text-gray-500 text-center py-4">로딩 중...</p>
                ) : notices.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">등록된 공지가 없습니다.</p>
                ) : (
                    notices.map((notice) => (
                        <div
                            key={notice.id}
                            className={`flex items-start justify-between p-3 rounded-lg border ${notice.isActive ? "bg-white border-gray-200" : "bg-gray-50 border-gray-200 opacity-60"
                                }`}
                        >
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`px-2 py-0.5 rounded text-xs font-medium ${notice.category === "urgent"
                                            ? "bg-red-100 text-red-700"
                                            : notice.category === "exception"
                                                ? "bg-amber-100 text-amber-700"
                                                : "bg-blue-100 text-blue-700"
                                            }`}
                                    >
                                        {notice.category === "urgent"
                                            ? "긴급"
                                            : notice.category === "exception"
                                                ? "예외"
                                                : "일반"}
                                    </span>
                                    {notice.relatedDocumentId && (
                                        <span className="text-xs text-gray-500 flex items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded">
                                            📄 {getDocumentTitle(notice.relatedDocumentId)}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-800">{notice.content}</p>
                            </div>
                            <button
                                onClick={() => toggleActive(notice)}
                                className={`flex items-center gap-1 px-2 py-1 rounded text-xs border ${notice.isActive
                                    ? "bg-green-50 border-green-200 text-green-700"
                                    : "bg-gray-100 border-gray-300 text-gray-500"
                                    }`}
                            >
                                {notice.isActive ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                {notice.isActive ? "활성" : "비활성"}
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
