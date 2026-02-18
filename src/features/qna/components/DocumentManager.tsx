import { useState } from "react";
import { FileText, Upload, Trash2, X, Calendar, Check } from "lucide-react";
import type { OfficialDocument } from "@/features/qna/lib/types";

interface DocumentManagerProps {
    documents: OfficialDocument[];
    loading: boolean;
    uploading: boolean;
    onUpload: (
        file: File,
        metadata: { title: string; documentNumber: string; uploadedBy: string },
        manualContent?: string
    ) => Promise<string>;
    onDelete: (id: string) => Promise<void>;
    onSetValidUntil: (id: string, validUntil: string) => Promise<void>;
    uploadedBy: string;
}

function formatDate(iso: string): string {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function isExpired(iso: string): boolean {
    return new Date(iso) < new Date();
}

export default function DocumentManager({
    documents,
    loading,
    uploading,
    onUpload,
    onDelete,
    onSetValidUntil,
    uploadedBy,
}: DocumentManagerProps) {
    const [showForm, setShowForm] = useState(false);
    const [title, setTitle] = useState("");
    const [documentNumber, setDocumentNumber] = useState("");
    const [manualContent, setManualContent] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [error, setError] = useState("");
    const [editingValidUntil, setEditingValidUntil] = useState<string | null>(null);
    const [validUntilInput, setValidUntilInput] = useState("");
    const [savingValidUntil, setSavingValidUntil] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !title.trim() || !documentNumber.trim()) {
            setError("파일, 제목, 공문번호를 모두 입력해주세요.");
            return;
        }
        setError("");
        try {
            await onUpload(
                file,
                {
                    title: title.trim(),
                    documentNumber: documentNumber.trim(),
                    uploadedBy,
                },
                manualContent.trim() || undefined
            );
            setTitle("");
            setDocumentNumber("");
            setManualContent("");
            setFile(null);
            setShowForm(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "업로드 실패");
        }
    };

    const handleSaveValidUntil = async (docId: string) => {
        if (!validUntilInput) return;
        setSavingValidUntil(true);
        try {
            await onSetValidUntil(docId, validUntilInput);
            setEditingValidUntil(null);
            setValidUntilInput("");
        } catch {
            // silent
        } finally {
            setSavingValidUntil(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-900">공문 관리</h3>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium"
                >
                    {showForm ? (
                        <>
                            <X className="h-4 w-4" />
                            닫기
                        </>
                    ) : (
                        <>
                            <Upload className="h-4 w-4" />
                            공문 업로드
                        </>
                    )}
                </button>
            </div>

            {/* Upload form */}
            {showForm && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    공문번호
                                </label>
                                <input
                                    type="text"
                                    value={documentNumber}
                                    onChange={(e) => setDocumentNumber(e.target.value)}
                                    placeholder="예: 경남복지-2026-001"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    제목
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="공문 제목"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                파일 (PDF)
                            </label>
                            <input
                                type="file"
                                accept=".pdf,.doc,.docx,.hwp"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                내용 직접 입력 (선택 - PDF 텍스트 추출이 안 될 경우)
                            </label>
                            <textarea
                                value={manualContent}
                                onChange={(e) => setManualContent(e.target.value)}
                                placeholder="PDF에서 자동 추출을 시도합니다. 추출이 잘 안 되면 여기에 직접 내용을 붙여넣으세요."
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                            />
                        </div>

                        {error && <p className="text-sm text-red-600">{error}</p>}

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={uploading}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                            >
                                {uploading ? "업로드 중..." : "업로드"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Document list */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-6 text-center text-gray-400 text-sm">
                        로딩 중...
                    </div>
                ) : documents.length === 0 ? (
                    <div className="p-6 text-center text-gray-400 text-sm">
                        등록된 공문이 없습니다
                    </div>
                ) : (
                    documents.map((doc) => (
                        <div
                            key={doc.id}
                            className="p-3 border-b border-gray-50 hover:bg-gray-50"
                        >
                            <div className="flex items-center gap-3">
                                <FileText className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-gray-900 truncate">
                                        [{doc.documentNumber}] {doc.title}
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <p className="text-xs text-gray-400 truncate flex-1">
                                            {doc.content
                                                ? doc.content.slice(0, 80) + "..."
                                                : "(내용 없음)"}
                                        </p>
                                        {doc.validUntil && (
                                            <span
                                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0 ${isExpired(doc.validUntil)
                                                    ? "bg-red-100 text-red-600"
                                                    : "bg-emerald-100 text-emerald-700"
                                                    }`}
                                            >
                                                <Calendar className="h-3 w-3" />
                                                ~ {formatDate(doc.validUntil)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    {editingValidUntil === doc.id ? (
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="date"
                                                aria-label="유효기간 설정"
                                                value={validUntilInput}
                                                onChange={(e) => setValidUntilInput(e.target.value)}
                                                className="px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-emerald-500"
                                            />
                                            <button
                                                onClick={() => handleSaveValidUntil(doc.id)}
                                                disabled={savingValidUntil || !validUntilInput}
                                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded disabled:opacity-50"
                                                title="저장"
                                            >
                                                <Check className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditingValidUntil(null);
                                                    setValidUntilInput("");
                                                }}
                                                className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                                                title="취소"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                setEditingValidUntil(doc.id);
                                                setValidUntilInput(doc.validUntil || "");
                                            }}
                                            className="p-1 text-gray-300 hover:text-amber-500 transition-colors"
                                            title="유효기간 설정"
                                        >
                                            <Calendar className="h-4 w-4" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => onDelete(doc.id)}
                                        className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                                        title="삭제"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
