import { useState, useEffect } from "react";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, History, Loader2 } from "lucide-react";
import { api } from "@/features/qna/api/client";

interface UploadRecord {
    id: string;
    filename: string;
    uploadedAt: string;
    uploadedBy: string;
    count: number;
}

export default function MowAllocationUpload() {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string; count?: number } | null>(null);
    const [history, setHistory] = useState<UploadRecord[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);

    useEffect(() => {
        api.get<UploadRecord[]>("/mow-allocation/history")
            .then(setHistory)
            .catch(() => setHistory([]))
            .finally(() => setLoadingHistory(false));
    }, []);

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setResult(null);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await api.post<{ success: boolean; count: number; filename: string; uploadedAt: string }>("/mow-allocation/upload", formData);
            setResult({ success: true, message: `${res.count}개 기관 배정인원 업로드 완료`, count: res.count });
            setFile(null);
            // 이력 갱신
            const updated = await api.get<UploadRecord[]>("/mow-allocation/history");
            setHistory(updated);
        } catch (err) {
            setResult({ success: false, message: err instanceof Error ? err.message : "업로드 실패" });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-5">
            <div>
                <h3 className="text-base font-bold text-gray-900 mb-1">광역 배정인원 업로드</h3>
                <p className="text-xs text-gray-500">
                    CSV 형식 파일을 업로드하세요.&nbsp;
                    <span className="font-mono text-gray-600">기관코드,전담사회복지사,생활지원사,이용자</span>
                </p>
            </div>

            {/* 업로드 영역 */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                <div className="relative border-2 border-dashed border-gray-300 hover:border-emerald-400 rounded-lg p-6 text-center transition-colors">
                    <input
                        type="file"
                        accept=".csv,.txt"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={(e) => {
                            setFile(e.target.files?.[0] ?? null);
                            setResult(null);
                        }}
                    />
                    <div className="pointer-events-none space-y-2">
                        <FileSpreadsheet className="h-8 w-8 mx-auto text-gray-400" />
                        {file ? (
                            <p className="text-sm font-medium text-emerald-600">{file.name}</p>
                        ) : (
                            <p className="text-sm text-gray-500">
                                <span className="font-medium text-emerald-600">클릭하여 선택</span>하거나 파일을 끌어다 놓으세요
                            </p>
                        )}
                        <p className="text-xs text-gray-400">CSV 파일 (.csv)</p>
                    </div>
                </div>

                {result && (
                    <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ${result.success ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                        {result.success
                            ? <CheckCircle className="h-4 w-4 flex-shrink-0" />
                            : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
                        {result.message}
                    </div>
                )}

                <div className="flex justify-end">
                    <button
                        onClick={handleUpload}
                        disabled={!file || uploading}
                        className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                    >
                        {uploading ? (
                            <><Loader2 className="h-4 w-4 animate-spin" />업로드 중...</>
                        ) : (
                            <><Upload className="h-4 w-4" />업로드</>
                        )}
                    </button>
                </div>
            </div>

            {/* 업로드 이력 */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                    <History className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-bold text-gray-800">업로드 이력</span>
                </div>
                {loadingHistory ? (
                    <div className="p-6 text-center">
                        <Loader2 className="h-4 w-4 animate-spin mx-auto text-gray-400" />
                    </div>
                ) : history.length === 0 ? (
                    <div className="p-6 text-center text-sm text-gray-400">업로드 이력이 없습니다</div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {history.map((record) => (
                            <div key={record.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-800 truncate">{record.filename}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        {new Date(record.uploadedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
                                        &nbsp;·&nbsp;{record.uploadedBy}
                                    </p>
                                </div>
                                <span className="ml-4 flex-shrink-0 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                                    {record.count}개 기관
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
