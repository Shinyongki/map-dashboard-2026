import { FileText, User, Phone, ChevronRight } from "lucide-react";
import type { OfficialDocument, Question } from "@/features/qna/lib/types";

interface DocumentGridProps {
    documents: OfficialDocument[];
    questions: Question[]; // Needed to calculate counts
    onSelect: (documentId: string | null) => void; // null for "General/All" or "Unspecified"
    isAdmin?: boolean;
}

export default function DocumentGrid({
    documents,
    questions,
    onSelect,
    isAdmin = false,
}: DocumentGridProps) {
    // Calculate stats per document
    const getStats = (docId: string | null) => {
        const related = questions.filter(q =>
            docId ? q.relatedDocumentId === docId : !q.relatedDocumentId
        );
        const pending = related.filter(q => q.status === "pending").length;
        const total = related.length;
        return { pending, total };
    };



    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">


            {/* Official Documents Cards */}
            {documents.map((doc) => {
                const stats = getStats(doc.id);
                return (
                    <button
                        key={doc.id}
                        onClick={() => onSelect(doc.id)}
                        className="flex flex-col h-full bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-500 hover:shadow-md transition-all text-left group"
                    >
                        <div className="flex items-start justify-between w-full mb-4">
                            <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                                <FileText className="h-6 w-6 text-blue-600" />
                            </div>
                            {stats.pending > 0 && (
                                <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full">
                                    대기 {stats.pending}
                                </span>
                            )}
                        </div>

                        <div className="mb-auto">
                            <span className="inline-block text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded mb-2">
                                {doc.documentNumber || "문서번호 없음"}
                            </span>
                            <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-blue-700 line-clamp-2">
                                {doc.title}
                            </h3>
                        </div>

                        {/* Manager Info */}
                        <div className="mt-4 space-y-1.5 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                                <User className="h-3.5 w-3.5 text-gray-400" />
                                <span>{doc.managerName || "담당자 미정"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Phone className="h-3.5 w-3.5 text-gray-400" />
                                <span>{doc.managerPhone || "전화번호 미등록"}</span>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between w-full text-sm text-gray-500">
                            <span>총 {stats.total}건</span>
                            <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500" />
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
