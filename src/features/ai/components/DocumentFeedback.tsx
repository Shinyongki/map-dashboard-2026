
import { useState, useRef } from 'react';
import { Upload, FileText, AlertTriangle, CheckCircle, X, Search, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useDocumentFeedback } from '../hooks/useDocumentFeedback';
import type { FeedbackItem } from '../lib/mock-ocr';

interface DocumentFeedbackProps {
    open: boolean;
    onClose: () => void;
}

export default function DocumentFeedback({ open, onClose }: DocumentFeedbackProps) {
    const {
        file,
        previewUrl,
        isAnalyzing,
        result,
        handleFileSelect,
        startAnalysis,
        reset
    } = useDocumentFeedback();

    const fileInputRef = useRef<HTMLInputElement>(null);

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
        }
    };

    const getSeverityColor = (type: FeedbackItem['type']) => {
        switch (type) {
            case 'typo': return 'text-orange-600 bg-orange-50 border-orange-200';
            case 'missing': return 'text-red-600 bg-red-50 border-red-200';
            case 'compliance': return 'text-blue-600 bg-blue-50 border-blue-200';
            case 'suggestion': return 'text-green-600 bg-green-50 border-green-200';
            default: return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    const getSeverityLabel = (type: FeedbackItem['type']) => {
        switch (type) {
            case 'typo': return '오타/맞춤법';
            case 'missing': return '누락 항목';
            case 'compliance': return '규정 위반';
            case 'suggestion': return '개선 제안';
            default: return '기타';
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="max-w-6xl h-[85vh] p-0 flex flex-col gap-0 overflow-hidden bg-gray-50/50 backdrop-blur-xl">
                <DialogHeader className="px-6 py-4 border-b border-gray-200 bg-white flex-shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-800">
                        <div className="p-2 bg-indigo-50 rounded-lg">
                            <Search className="h-5 w-5 text-indigo-600" />
                        </div>
                        공문서 AI 검토 도우미
                        <Badge variant="outline" className="ml-2 text-xs font-normal text-gray-500">
                            Beta
                        </Badge>
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 flex overflow-hidden">
                    {/* Left: Document Preview */}
                    <div className="flex-1 bg-gray-100/50 p-6 flex flex-col items-center justify-center border-r border-gray-200 relative">
                        {!file ? (
                            <div className="text-center space-y-4">
                                <div
                                    className="w-full max-w-sm mx-auto h-64 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center bg-white hover:bg-gray-50 hover:border-indigo-400 transition-all cursor-pointer group"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className="p-4 bg-indigo-50 rounded-full mb-4 group-hover:scale-110 transition-transform">
                                        <Upload className="h-8 w-8 text-indigo-600" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-700">공문서 업로드</h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        이미지(JPG, PNG) 또는 PDF 파일을<br />여기로 끌어오거나 클릭하세요
                                    </p>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*,application/pdf"
                                        onChange={onFileChange}
                                    />
                                </div>
                                <div className="text-xs text-gray-400">
                                    * 민감한 개인정보는 자동으로 마스킹 처리됩니다 (예정)
                                </div>
                            </div>
                        ) : (
                            <div className="w-full h-full flex flex-col">
                                <ScrollArea className="flex-1 w-full bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                                    {/* Image Preview */}
                                    {previewUrl && (
                                        <img src={previewUrl} alt="Preview" className="max-w-full h-auto mx-auto shadow-lg" />
                                    )}
                                    {/* PDF preview would go here */}
                                    {!previewUrl && (
                                        <div className="flex items-center justify-center h-full text-gray-400">
                                            <FileText className="h-16 w-16 mb-2 opacity-50" />
                                            <p>문서 미리보기 준비 중</p>
                                        </div>
                                    )}
                                </ScrollArea>
                                <div className="mt-4 flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                            <FileText className="h-5 w-5 text-gray-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm text-gray-900 truncate max-w-[200px]">{file.name}</p>
                                            <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={reset} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                                        <X className="h-4 w-4 mr-1" />
                                        취소
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Analysis Overlay Loading */}
                        {isAnalyzing && (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                                <Loader2 className="h-12 w-12 text-indigo-600 animate-spin mb-4" />
                                <h3 className="text-xl font-bold text-gray-800">문서 분석 중...</h3>
                                <p className="text-gray-500 mt-2">OCR 텍스트 추출 및 규정 검토를 진행하고 있습니다.</p>
                            </div>
                        )}
                    </div>

                    {/* Right: Feedback Panel */}
                    <div className="w-[450px] bg-white flex flex-col border-l border-gray-200 shadow-xl">
                        {!result ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/30">
                                <div className="h-16 w-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 shadow-sm transform -rotate-3">
                                    <Search className="h-8 w-8 text-indigo-600" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">AI 문서 분석</h3>
                                <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto mb-8">
                                    공문서를 업로드하고 <b>[분석 시작]</b> 버튼을 누르면<br />
                                    오타, 누락된 항목, 규정 준수 여부를<br />
                                    자동으로 검토해드립니다.
                                </p>
                                <Button
                                    className="w-full max-w-xs h-12 text-lg shadow-lg bg-indigo-600 hover:bg-indigo-700 transition-all hover:scale-105"
                                    disabled={!file || isAnalyzing}
                                    onClick={startAnalysis}
                                >
                                    {isAnalyzing ? "분석 중..." : "분석 시작하기"}
                                </Button>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col h-full">
                                {/* Score Header */}
                                <div className="p-6 bg-gradient-to-br from-indigo-50 to-white border-b border-indigo-100">
                                    <div className="flex justify-between items-end mb-4">
                                        <div>
                                            <p className="text-sm font-semibold text-indigo-900 mb-1">문서 정확도 점수</p>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-4xl font-extrabold text-indigo-600">{result.score}</span>
                                                <span className="text-gray-400 font-medium">/ 100</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <Badge variant="secondary" className="bg-white border-indigo-200 text-indigo-700 px-3 py-1">
                                                {result.feedback.length}개의 개선 제안
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="w-full bg-indigo-100 rounded-full h-2">
                                        <div
                                            className="bg-indigo-600 h-2 rounded-full transition-all duration-1000 ease-out"
                                            style={{ width: `${result.score}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Results List */}
                                <ScrollArea className="flex-1 p-6">
                                    <div className="space-y-4">
                                        {result.feedback.map((item) => (
                                            <div key={item.id} className="group bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer">
                                                <div className="flex justify-between items-start mb-3">
                                                    <span className={`text-xs font-bold px-2 py-1 rounded-md border ${getSeverityColor(item.type)}`}>
                                                        {getSeverityLabel(item.type)}
                                                    </span>
                                                    <span className="text-xs text-gray-400 flex items-center gap-1">
                                                        {item.location}
                                                    </span>
                                                </div>

                                                <div className="flex gap-3 mb-3">
                                                    <div className="flex-1 p-2 bg-red-50 rounded-lg border border-red-100">
                                                        <p className="text-xs text-red-500 font-medium mb-1">수정 전</p>
                                                        <p className="text-sm text-gray-800 font-medium line-through decoration-red-300">{item.original}</p>
                                                    </div>
                                                    <div className="flex items-center text-gray-400">
                                                        <ChevronRight className="h-5 w-5" />
                                                    </div>
                                                    <div className="flex-1 p-2 bg-green-50 rounded-lg border border-green-100">
                                                        <p className="text-xs text-green-600 font-medium mb-1">AI 제안</p>
                                                        <p className="text-sm text-gray-900 font-bold">{item.suggestion}</p>
                                                    </div>
                                                </div>

                                                <div className="flex gap-2 items-start mt-2 pt-2 border-t border-gray-50">
                                                    <AlertTriangle className="h-3.5 w-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                                                    <p className="text-xs text-gray-500 leading-relaxed">{item.reason}</p>
                                                </div>
                                            </div>
                                        ))}

                                        {result.feedback.length === 0 && (
                                            <div className="text-center py-10">
                                                <div className="h-16 w-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <CheckCircle className="h-8 w-8 text-green-600" />
                                                </div>
                                                <h3 className="text-lg font-bold text-gray-900">완벽합니다!</h3>
                                                <p className="text-gray-500 text-sm">발견된 오류나 개선 사항이 없습니다.</p>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>

                                <div className="p-4 border-t border-gray-200 bg-gray-50">
                                    <Button className="w-full bg-gray-900 text-white hover:bg-black">
                                        <FileText className="h-4 w-4 mr-2" />
                                        결과 리포트 다운로드
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
