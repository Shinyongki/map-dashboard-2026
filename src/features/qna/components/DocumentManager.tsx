import { useState } from "react";
import { FileText, Upload, Trash2, X, Calendar, Check, Edit2, Megaphone, User as UserIcon, Phone, Plus } from "lucide-react";
import { useNotices } from "@/features/qna/hooks/useNotices";
import type { OfficialDocument } from "@/features/qna/lib/types";

interface DocumentManagerProps {
    documents: OfficialDocument[];
    loading: boolean;
    uploading: boolean;
    onUpload: (
        files: File[],
        metadata: {
            title: string;
            documentNumber: string;
            managerName: string;
            managerPhone: string;
            uploadedBy: string;
        },
        manualContent?: string
    ) => Promise<any>;
    onUpdate: (id: string, data: Partial<OfficialDocument> | FormData) => Promise<void>;
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
    onUpdate,
    onDelete,
    onSetValidUntil,
    uploadedBy,
}: DocumentManagerProps) {
    const [showForm, setShowForm] = useState(false);
    const [title, setTitle] = useState("");
    const [documentNumber, setDocumentNumber] = useState("");
    const [managerName, setManagerName] = useState("");
    const [managerPhone, setManagerPhone] = useState("");
    const [manualContent, setManualContent] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [error, setError] = useState("");
    const [editingValidUntil, setEditingValidUntil] = useState<string | null>(null);
    const [validUntilInput, setValidUntilInput] = useState("");
    const [savingValidUntil, setSavingValidUntil] = useState(false);

    // Edit state for general document info
    const [editingDocId, setEditingDocId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [editDocNum, setEditDocNum] = useState("");
    const [editManagerName, setEditManagerName] = useState("");
    const [editManagerPhone, setEditManagerPhone] = useState("");
    const [editFile, setEditFile] = useState<File | null>(null);
    const [editManualContent, setEditManualContent] = useState("");
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    // Notice management expansion
    const [expandedDocId, setExpandedDocId] = useState<string | null>(null);

    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            setFiles(Array.from(e.dataTransfer.files));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (files.length === 0 || !title.trim() || !documentNumber.trim() || !managerName.trim() || !managerPhone.trim()) {
            setError("파일(최소 1개), 제목, 공문번호, 담당자 정보를 모두 입력해주세요.");
            return;
        }
        setError("");
        try {
            await onUpload(
                files,
                {
                    title: title.trim(),
                    documentNumber: documentNumber.trim(),
                    managerName: managerName.trim(),
                    managerPhone: managerPhone.trim(),
                    uploadedBy,
                },
                manualContent.trim() || undefined
            );
            setTitle("");
            setDocumentNumber("");
            setManagerName("");
            setManagerPhone("");
            setManualContent("");
            setFiles([]);
            setShowForm(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "업로드 실패");
        }
    };

    const handleEditStart = (doc: OfficialDocument) => {
        setEditingDocId(doc.id);
        setEditTitle(doc.title);
        setEditDocNum(doc.documentNumber);
        setEditManagerName(doc.managerName || "");
        setEditManagerPhone(doc.managerPhone || "");
        setEditFile(null);
        setEditManualContent(doc.content || "");
    };

    const handleSaveEdit = async () => {
        if (!editingDocId) return;
        setIsSavingEdit(true);
        try {
            const formData = new FormData();
            formData.append("title", editTitle);
            formData.append("documentNumber", editDocNum);
            formData.append("managerName", editManagerName);
            formData.append("managerPhone", editManagerPhone);
            if (editFile) {
                formData.append("file", editFile);
            }
            if (editManualContent) {
                formData.append("content", editManualContent);
            }

            await onUpdate(editingDocId, formData);
            setEditingDocId(null);
        } catch (err) {
            console.error("Update failed:", err);
            alert("수정 실패: " + (err instanceof Error ? err.message : String(err)));
        } finally {
            setIsSavingEdit(false);
        }
    };

    const handleSaveValidUntil = async (docId: string) => {
        if (!validUntilInput) return;
        setSavingValidUntil(true);
        try {
            await onSetValidUntil(docId, validUntilInput);
            setEditingValidUntil(null);
            setValidUntilInput("");
        } catch (err) {
            alert("기간 설정 실패: " + (err instanceof Error ? err.message : String(err)));
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

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    담당자 성명
                                </label>
                                <input
                                    type="text"
                                    value={managerName}
                                    onChange={(e) => setManagerName(e.target.value)}
                                    placeholder="예: 홍길동"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    문의 연락처
                                </label>
                                <input
                                    type="text"
                                    value={managerPhone}
                                    onChange={(e) => setManagerPhone(e.target.value)}
                                    placeholder="예: 051-123-4567"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                파일 (PDF, MD, TXT / 다중 선택 및 드래그 가능)
                            </label>
                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all ${isDragging
                                    ? "border-emerald-500 bg-emerald-50"
                                    : "border-gray-300 hover:border-emerald-400"
                                    }`}
                            >
                                <input
                                    type="file"
                                    accept=".pdf,.doc,.docx,.hwp,.md,.txt"
                                    multiple
                                    onChange={(e) => {
                                        if (e.target.files) {
                                            setFiles(Array.from(e.target.files));
                                        }
                                    }}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div className="space-y-2 pointer-events-none">
                                    <Upload className={`h-8 w-8 mx-auto mb-2 transition-colors ${isDragging ? "text-emerald-500" : "text-gray-400"}`} />
                                    <p className="text-sm text-gray-600">
                                        {files.length > 0 ? (
                                            <span className="text-emerald-600 font-medium">
                                                {files.length}개의 파일 선택됨
                                            </span>
                                        ) : (
                                            <>
                                                <span className="font-medium text-emerald-600">클릭하여 업로드</span>
                                                <span className="text-gray-500"> 하거나 파일을 여기로 끌어다 놓으세요</span>
                                            </>
                                        )}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        PDF, MD, TXT, HWP 등 지원
                                    </p>
                                </div>
                            </div>

                            {files.length > 0 && (
                                <div className="mt-3 space-y-1 max-h-32 overflow-y-auto pr-1">
                                    {files.map((f, i) => (
                                        <div key={i} className="text-xs text-gray-600 flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                                            <div className="flex items-center gap-2 truncate">
                                                <FileText className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                                                <span className="truncate">{f.name}</span>
                                            </div>
                                            <span className="text-[10px] text-gray-400 ml-2 flex-shrink-0">
                                                {(f.size / 1024).toFixed(1)} KB
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
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
                            className="border-b border-gray-100 last:border-0"
                        >
                            <div className="p-4 hover:bg-gray-50 flex items-start gap-4 transition-colors">
                                <div className="p-2 bg-emerald-50 rounded-lg flex-shrink-0">
                                    <FileText className="h-5 w-5 text-emerald-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    {editingDocId === doc.id ? (
                                        <div className="space-y-3 p-2 bg-white border border-emerald-200 rounded-lg shadow-sm">
                                            <div className="grid grid-cols-2 gap-2">
                                                <input
                                                    value={editTitle}
                                                    onChange={(e) => setEditTitle(e.target.value)}
                                                    className="px-2 py-1.5 border border-gray-300 rounded text-sm w-full"
                                                    placeholder="제목"
                                                />
                                                <input
                                                    value={editDocNum}
                                                    onChange={(e) => setEditDocNum(e.target.value)}
                                                    className="px-2 py-1.5 border border-gray-300 rounded text-sm w-full"
                                                    placeholder="공문번호"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <input
                                                    value={editManagerName}
                                                    onChange={(e) => setEditManagerName(e.target.value)}
                                                    className="px-2 py-1.5 border border-gray-300 rounded text-sm w-full"
                                                    placeholder="담당자명"
                                                />
                                                <input
                                                    value={editManagerPhone}
                                                    onChange={(e) => setEditManagerPhone(e.target.value)}
                                                    className="px-2 py-1.5 border border-gray-300 rounded text-sm w-full"
                                                    placeholder="연락처"
                                                />
                                            </div>
                                            <div className="text-sm border-t border-gray-100 pt-2 mt-2">
                                                <label className="block text-gray-700 mb-1 text-xs font-medium">단일 파일 교체 (선택)</label>
                                                <div className="flex flex-col gap-2">
                                                    <input 
                                                        type="file" 
                                                        accept=".pdf,.doc,.docx,.hwp,.md,.txt" 
                                                        onChange={(e) => setEditFile(e.target.files?.[0] || null)}
                                                        className="text-xs text-gray-600 file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                                                    />
                                                    {editFile && <span className="text-xs text-emerald-600 truncate"><FileText className="inline w-3 h-3 mr-1" />{editFile.name} 선택됨</span>}
                                                    {!editFile && <span className="text-[10px] text-gray-400">새 파일을 선택하면 기존 파일이 대체됩니다.</span>}
                                                </div>
                                            </div>

                                            <div className="text-sm">
                                                <label className="block text-gray-700 mb-1 text-xs font-medium">내용 수동 수정</label>
                                                <textarea
                                                    value={editManualContent}
                                                    onChange={(e) => setEditManualContent(e.target.value)}
                                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 min-h-[100px] resize-y custom-scrollbar"
                                                    placeholder="내용"
                                                />
                                            </div>
                                            <div className="flex justify-end gap-1.5">
                                                <button
                                                    onClick={() => setEditingDocId(null)}
                                                    className="px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 bg-gray-100 rounded"
                                                >
                                                    취소
                                                </button>
                                                <button
                                                    onClick={handleSaveEdit}
                                                    disabled={isSavingEdit}
                                                    className="px-3 py-1 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded disabled:opacity-50"
                                                >
                                                    {isSavingEdit ? "저장 중" : "저장"}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-sm font-bold text-gray-900 truncate">
                                                    [{doc.documentNumber}] {doc.title}
                                                </h4>
                                                {doc.validUntil && (
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${isExpired(doc.validUntil) ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                                                        {isExpired(doc.validUntil) ? "만료" : "게시중"}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                                <div className="flex items-center gap-1">
                                                    <UserIcon className="h-3 w-3" /> {doc.managerName || "담당자 미지정"}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Phone className="h-3 w-3" /> {doc.managerPhone || "연락처 미등록"}
                                                </div>
                                                {doc.validUntil && (
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" /> ~ {formatDate(doc.validUntil)}
                                                    </div>
                                                )}
                                            </div>
                                            <p className="mt-2 text-xs text-gray-400 truncate opacity-60">
                                                {doc.content ? doc.content.slice(0, 100) + "..." : "내용 추출 실패"}
                                            </p>
                                        </>
                                    )}
                                </div>

                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setExpandedDocId(expandedDocId === doc.id ? null : doc.id)}
                                        className={`p-1.5 rounded-lg transition-colors ${expandedDocId === doc.id ? "bg-purple-100 text-purple-700" : "text-gray-400 hover:bg-gray-100"}`}
                                        title="공지사항 관리"
                                    >
                                        <Megaphone className="h-5 w-5" />
                                    </button>
                                    <button
                                        onClick={() => handleEditStart(doc)}
                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors"
                                        title="기본 정보 수정"
                                    >
                                        <Edit2 className="h-5 w-5" />
                                    </button>
                                    <button
                                        onClick={() => onDelete(doc.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-colors"
                                        title="삭제"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Integrated Notice Management */}
                            {expandedDocId === doc.id && (
                                <div className="px-14 pb-4 animate-in slide-in-from-top-2 duration-200">
                                    <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-4">
                                        <DocumentNoticeList documentId={doc.id} />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

// --- Internal Sub-component for Notice Management ---
function DocumentNoticeList({ documentId }: { documentId: string }) {
    const { notices, addNotice, updateNotice, loading } = useNotices(documentId);
    const [isAdding, setIsAdding] = useState(false);
    const [newContent, setNewContent] = useState("");
    const [newCategory, setNewCategory] = useState<"general" | "urgent" | "exception">("general");

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newContent.trim()) return;
        const success = await addNotice(newContent, newCategory, true, documentId);
        if (success) {
            setNewContent("");
            setIsAdding(false);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                <span className="text-xs font-bold text-purple-700 flex items-center gap-1">
                    <Megaphone className="h-3.5 w-3.5" /> 관련 공지사항
                </span>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="text-[10px] font-bold text-purple-600 hover:text-purple-800 flex items-center gap-0.5"
                >
                    {isAdding ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                    {isAdding ? "취소" : "공지 추가"}
                </button>
            </div>

            {isAdding && (
                <form onSubmit={handleAdd} className="space-y-2 animate-in fade-in duration-200">
                    <textarea
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                        placeholder="공지 내용을 입력하세요..."
                        className="w-full px-2 py-1.5 border border-purple-200 rounded text-xs focus:ring-1 focus:ring-purple-400 focus:border-purple-400 outline-none"
                        rows={2}
                    />
                    <div className="flex items-center justify-between">
                        <select
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value as any)}
                            title="공지 유형 선택"
                            className="text-[10px] border border-purple-200 rounded px-1.5 py-1 outline-none bg-white"
                        >
                            <option value="general">일반</option>
                            <option value="urgent">긴급</option>
                            <option value="exception">예외규정</option>
                        </select>
                        <button
                            type="submit"
                            className="px-3 py-1 bg-purple-600 text-white text-[10px] font-bold rounded hover:bg-purple-700"
                        >
                            등록
                        </button>
                    </div>
                </form>
            )}

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                {loading ? (
                    <div className="text-center py-4">
                        <div className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
                    </div>
                ) : notices.length === 0 ? (
                    <p className="text-[10px] text-gray-400 text-center py-2 italic font-medium">연관된 공지사항이 없습니다.</p>
                ) : (
                    notices.map((notice) => (
                        <div
                            key={notice.id}
                            className={`flex items-start justify-between p-2 rounded border bg-white shadow-sm transition-all ${notice.isActive ? "border-purple-100" : "border-gray-100 opacity-60"}`}
                        >
                            <div className="flex-1 min-w-0 pr-2">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className={`text-[9px] font-bold px-1 rounded ${notice.category === "urgent" ? "bg-red-50 text-red-600" : notice.category === "exception" ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"}`}>
                                        {notice.category === "urgent" ? "긴급" : notice.category === "exception" ? "예외" : "일반"}
                                    </span>
                                    <span className="text-[9px] text-gray-400">{new Date(notice.createdAt).toLocaleDateString()}</span>
                                </div>
                                <p className="text-[11px] text-gray-700 break-all leading-relaxed">{notice.content}</p>
                            </div>
                            <button
                                onClick={() => updateNotice(notice.id, { isActive: !notice.isActive })}
                                className={`flex-shrink-0 p-1 rounded transition-colors ${notice.isActive ? "text-green-600 hover:bg-green-50" : "text-gray-300 hover:bg-gray-100"}`}
                                title={notice.isActive ? "비활성화" : "활성화"}
                            >
                                {notice.isActive ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
