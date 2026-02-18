import { useState, useMemo } from "react";
import { Search, Loader2, FileText, Zap, BookOpen, AlertTriangle } from "lucide-react";
import type { OfficialDocument } from "@/features/qna/lib/types";
import { api } from "@/features/qna/api/client";

interface InstantQueryProps {
    documents: OfficialDocument[];
}

interface QueryResult {
    answer: string;
    source: "cache" | "ai";
    faqQuestion?: string;
    documentTitle: string;
    documentNumber: string;
}

function formatDate(iso: string): string {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function getDaysUntil(iso: string): number {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(iso);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function InstantQuery({ documents }: InstantQueryProps) {
    const [documentId, setDocumentId] = useState("");
    const [question, setQuestion] = useState("");
    const [result, setResult] = useState<QueryResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Filter out expired documents, keep those without validUntil
    const activeDocuments = useMemo(() => {
        const now = new Date();
        return documents.filter(
            (doc) => !doc.validUntil || new Date(doc.validUntil) >= now
        );
    }, [documents]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!documentId || !question.trim()) {
            setError("공문을 선택하고 질문을 입력해주세요.");
            return;
        }
        setError("");
        setLoading(true);
        setResult(null);
        try {
            const res = await api.post<QueryResult>("/questions/instant-query", {
                question: question.trim(),
                documentId,
            });
            setResult(res);
        } catch (err) {
            setError(err instanceof Error ? err.message : "답변 생성에 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Query Form */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center justify-center w-8 h-8 bg-violet-100 rounded-lg">
                        <Zap className="h-4 w-4 text-violet-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">즉시 질의</h3>
                    <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-xs font-medium rounded-full">
                        실시간 답변
                    </span>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                    공문을 선택하고 궁금한 점을 자연어로 질문하세요. FAQ 캐시 또는 AI가 즉시 답변합니다.
                </p>

                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            공문 선택
                        </label>
                        <select
                            aria-label="공문 선택"
                            value={documentId}
                            onChange={(e) => setDocumentId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                        >
                            <option value="">공문을 선택하세요</option>
                            {activeDocuments.map((doc) => {
                                const daysLeft = doc.validUntil ? getDaysUntil(doc.validUntil) : null;
                                const isUrgent = daysLeft !== null && daysLeft <= 7 && daysLeft >= 0;
                                const label = doc.validUntil
                                    ? `[${doc.documentNumber}] ${doc.title} (~ ${formatDate(doc.validUntil)})`
                                    : `[${doc.documentNumber}] ${doc.title}`;
                                return (
                                    <option
                                        key={doc.id}
                                        value={doc.id}
                                        style={isUrgent ? { color: "#d97706" } : undefined}
                                    >
                                        {isUrgent ? `⚠ ${label}` : label}
                                    </option>
                                );
                            })}
                        </select>
                        {/* Urgent warning below select */}
                        {documentId && (() => {
                            const selectedDoc = activeDocuments.find((d) => d.id === documentId);
                            if (!selectedDoc?.validUntil) return null;
                            const daysLeft = getDaysUntil(selectedDoc.validUntil);
                            if (daysLeft > 7 || daysLeft < 0) return null;
                            return (
                                <p className="mt-1 flex items-center gap-1 text-xs text-amber-600">
                                    <AlertTriangle className="h-3 w-3" />
                                    유효기간 {daysLeft}일 남음 (~ {formatDate(selectedDoc.validUntil)})
                                </p>
                            );
                        })()}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            질문
                        </label>
                        <textarea
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="궁금한 내용을 자유롭게 입력하세요 (예: 서비스 대상자 나이 기준이 어떻게 변경되었나요?)"
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 resize-none"
                        />
                    </div>

                    {error && <p className="text-sm text-red-600">{error}</p>}

                    <button
                        type="submit"
                        disabled={loading || !documentId || !question.trim()}
                        className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                답변 생성 중...
                            </>
                        ) : (
                            <>
                                <Search className="h-4 w-4" />
                                질문하기
                            </>
                        )}
                    </button>
                </form>
            </div>

            {/* Result */}
            {result && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    {/* Source badge */}
                    <div className="flex items-center gap-2 mb-3">
                        {result.source === "cache" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                                <BookOpen className="h-3 w-3" />
                                FAQ 캐시
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                                <Zap className="h-3 w-3" />
                                AI 답변
                            </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                            <FileText className="h-3 w-3" />
                            {result.documentTitle}
                        </span>
                    </div>

                    {/* Matched FAQ question (if cache hit) */}
                    {result.source === "cache" && result.faqQuestion && (
                        <div className="mb-3 px-3 py-2 bg-green-50 rounded-lg border border-green-200">
                            <p className="text-xs text-green-600 font-medium mb-0.5">매칭된 FAQ</p>
                            <p className="text-sm text-green-800">{result.faqQuestion}</p>
                        </div>
                    )}

                    {/* Answer */}
                    <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                        {result.answer}
                    </div>

                    {/* Source reference */}
                    <div className="mt-4 pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-400">
                            출처: {result.source === "cache"
                                ? `FAQ 캐시 (${result.documentNumber} 공문 기준)`
                                : `AI 답변 (${result.documentNumber} 공문 기준)`}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
