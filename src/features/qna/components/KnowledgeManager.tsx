import { useState, useEffect, useCallback } from "react";
import { BookOpen, Plus, Trash2, Upload, FileText, Loader2, X, Database } from "lucide-react";
import { api } from "@/features/qna/api/client";

// ─── 타입 ────────────────────────────────────────────────────
interface KnowledgeItem {
    id: string;
    title: string;
    category: string;
    content: string;
    source: string;
    createdAt: string;
    chunkCount: number;
}

type KnowledgeCategory = "사업지침" | "행정절차" | "매뉴얼" | "규정" | "기타";

const CATEGORIES: KnowledgeCategory[] = ["사업지침", "행정절차", "매뉴얼", "규정", "기타"];

const CATEGORY_COLORS: Record<string, string> = {
    사업지침: "bg-blue-100 text-blue-700",
    행정절차: "bg-green-100 text-green-700",
    매뉴얼: "bg-purple-100 text-purple-700",
    규정: "bg-orange-100 text-orange-700",
    기타: "bg-gray-100 text-gray-600",
};

// ─── 유틸 ────────────────────────────────────────────────────
function formatDate(iso: string): string {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function truncateText(text: string, max: number): string {
    return text.length > max ? text.slice(0, max) + "..." : text;
}

// ─── 컴포넌트 ────────────────────────────────────────────────
export default function KnowledgeManager() {
    const [items, setItems] = useState<KnowledgeItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [error, setError] = useState("");

    // 폼 상태
    const [title, setTitle] = useState("");
    const [category, setCategory] = useState<KnowledgeCategory>("사업지침");
    const [content, setContent] = useState("");
    const [inputMode, setInputMode] = useState<"text" | "file">("text");
    const [files, setFiles] = useState<File[]>([]);
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

    // ─── 데이터 로드 ─────────────────────────────────────────
    const fetchItems = useCallback(async () => {
        try {
            setLoading(true);
            const data = await api.get<KnowledgeItem[]>("/knowledge");
            setItems(data);
        } catch (err) {
            console.error("지식 목록 로드 실패:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    // ─── 등록 ────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !category) {
            setError("제목과 카테고리를 입력해주세요.");
            return;
        }
        if (inputMode === "text" && !content.trim()) {
            setError("내용을 입력해주세요.");
            return;
        }
        if (inputMode === "file" && files.length === 0) {
            setError("파일을 최소 하나 이상 선택해주세요.");
            return;
        }

        setError("");
        setSubmitting(true);

        try {
            if (inputMode === "file" && files.length > 0) {
                const formData = new FormData();
                formData.append("title", title.trim());
                formData.append("category", category);
                files.forEach(f => {
                    formData.append("files", f);
                });
                await api.post("/knowledge", formData);
            } else {
                await api.post("/knowledge", {
                    title: title.trim(),
                    category,
                    content: content.trim(),
                });
            }

            // 폼 초기화
            setTitle("");
            setContent("");
            setFiles([]);
            setShowForm(false);
            await fetchItems();
        } catch (err) {
            setError(err instanceof Error ? err.message : "등록에 실패했습니다.");
        } finally {
            setSubmitting(false);
        }
    };

    // ─── 삭제 ────────────────────────────────────────────────
    const handleDelete = async (id: string) => {
        if (!confirm("이 지식 항목을 삭제하시겠습니까?")) return;

        setDeletingId(id);
        try {
            await api.delete(`/knowledge/${id}`);
            await fetchItems();
        } catch (err) {
            console.error("삭제 실패:", err);
        } finally {
            setDeletingId(null);
        }
    };

    // ─── 렌더링 ──────────────────────────────────────────────
    return (
        <div className="space-y-4">
            {/* 헤더 */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 bg-teal-100 rounded-xl">
                            <Database className="h-5 w-5 text-teal-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">지식체계 관리</h3>
                            <p className="text-xs text-gray-500 mt-0.5">
                                LLM이 질문 답변 시 참고하는 내부 지식 데이터를 관리합니다
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                const data = JSON.stringify(items, null, 2);
                                const blob = new Blob([data], { type: "application/json" });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = `knowledge-backup-${new Date().toISOString().slice(0, 10)}.json`;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(url);
                            }}
                            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors border border-gray-200"
                            title="전체 지식 데이터 백업 (JSON)"
                        >
                            <Database className="h-4 w-4" />
                            백업 다운로드
                        </button>
                        <button
                            onClick={() => setShowForm(!showForm)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            {showForm ? (
                                <>
                                    <X className="h-4 w-4" />
                                    닫기
                                </>
                            ) : (
                                <>
                                    <Plus className="h-4 w-4" />
                                    지식 등록
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* 통계 */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-center">
                        <span className="text-2xl font-bold text-teal-600">{items.length}</span>
                        <p className="text-xs text-teal-700 mt-0.5">전체 항목</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                        <span className="text-2xl font-bold text-blue-600">
                            {items.reduce((sum, item) => sum + item.chunkCount, 0)}
                        </span>
                        <p className="text-xs text-blue-700 mt-0.5">전체 청크</p>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
                        <span className="text-2xl font-bold text-purple-600">
                            {new Set(items.map((i) => i.category)).size}
                        </span>
                        <p className="text-xs text-purple-700 mt-0.5">카테고리</p>
                    </div>
                </div>
            </div>

            {/* 등록 폼 */}
            {showForm && (
                <div className="bg-white rounded-xl border border-teal-200 p-6">
                    <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-teal-600" />
                        새 지식 등록
                    </h4>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* 제목 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                제목 <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="예: 2026년 노인맞춤돌봄서비스 사업안내 핵심 요약"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            />
                        </div>

                        {/* 카테고리 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                카테고리 <span className="text-red-500">*</span>
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {CATEGORIES.map((cat) => (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => setCategory(cat)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${category === cat
                                            ? "bg-teal-100 text-teal-700 border-teal-300"
                                            : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                                            }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 입력 방식 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                입력 방식
                            </label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setInputMode("text")}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${inputMode === "text"
                                        ? "bg-teal-50 text-teal-700 border-teal-300"
                                        : "bg-gray-50 text-gray-500 border-gray-200"
                                        }`}
                                >
                                    <FileText className="h-3.5 w-3.5" />
                                    직접 입력
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setInputMode("file")}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${inputMode === "file"
                                        ? "bg-teal-50 text-teal-700 border-teal-300"
                                        : "bg-gray-50 text-gray-500 border-gray-200"
                                        }`}
                                >
                                    <Upload className="h-3.5 w-3.5" />
                                    파일 업로드
                                </button>
                            </div>
                        </div>

                        {/* 내용 입력 */}
                        {inputMode === "text" ? (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    내용 <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="지식 내용을 입력하세요. 사업지침, 매뉴얼, 규정 등의 핵심 내용을 정리하여 입력합니다."
                                    rows={8}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
                                />
                                <p className="text-xs text-gray-400 mt-1">
                                    {content.length}자 입력됨
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    파일 선택 <span className="text-red-500">*</span>
                                </label>
                                <div
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all ${isDragging
                                        ? "border-teal-500 bg-teal-50 shadow-inner"
                                        : "border-gray-300 hover:border-teal-400"
                                        }`}
                                >
                                    <input
                                        type="file"
                                        accept=".txt,.md"
                                        multiple
                                        onChange={(e) => {
                                            if (e.target.files) {
                                                setFiles(Array.from(e.target.files));
                                            }
                                        }}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        id="knowledge-file-input"
                                    />
                                    <div className="pointer-events-none">
                                        <Upload className={`h-8 w-8 mx-auto mb-2 transition-colors ${isDragging ? "text-teal-500" : "text-gray-400"}`} />
                                        <p className="text-sm text-gray-600">
                                            {files.length > 0 ? (
                                                <span className="text-teal-600 font-medium">
                                                    {files.length}개의 파일 선택됨
                                                </span>
                                            ) : (
                                                <>
                                                    <span className="font-medium text-teal-600">클릭하여 업로드</span>
                                                    <span className="text-gray-500"> 하거나 파일을 여기로 끄세요</span>
                                                </>
                                            )}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            .txt, .md 파일 다중 지원
                                        </p>
                                    </div>
                                </div>

                                {files.length > 0 && (
                                    <div className="mt-3 space-y-1 max-h-40 overflow-y-auto pr-1">
                                        {files.map((f, i) => (
                                            <div key={i} className="text-[11px] text-gray-600 flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                                                <div className="flex items-center gap-2 truncate">
                                                    <FileText className="h-3.5 w-3.5 text-teal-500 flex-shrink-0" />
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
                        )}

                        {error && (
                            <p className="text-sm text-red-600">{error}</p>
                        )}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    등록 중...
                                </>
                            ) : (
                                <>
                                    <Plus className="h-4 w-4" />
                                    등록하기
                                </>
                            )}
                        </button>
                    </form>
                </div>
            )}

            {/* 지식 목록 */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-400">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                        <p className="text-sm">지식 목록 로드 중...</p>
                    </div>
                ) : items.length === 0 ? (
                    <div className="p-8 text-center">
                        <Database className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-500">등록된 지식이 없습니다</p>
                        <p className="text-xs text-gray-400 mt-1">
                            상단의 "지식 등록" 버튼을 눌러 지식을 추가해보세요
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {items.map((item) => (
                            <div
                                key={item.id}
                                className="p-4 hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span
                                                className={`px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[item.category] || CATEGORY_COLORS["기타"]
                                                    }`}
                                            >
                                                {item.category}
                                            </span>
                                            <h4 className="text-sm font-semibold text-gray-900 truncate">
                                                {item.title}
                                            </h4>
                                        </div>
                                        <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                                            {truncateText(item.content, 150)}
                                        </p>
                                        <div className="flex items-center gap-3 text-xs text-gray-400">
                                            <span>📅 {formatDate(item.createdAt)}</span>
                                            <span>📄 {item.source}</span>
                                            <span>🧩 {item.chunkCount}개 청크</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        disabled={deletingId === item.id}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                                        title="삭제"
                                    >
                                        {deletingId === item.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
