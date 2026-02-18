
import { useState } from "react";
import { X, FileText, Download, Wand2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useChat } from "@/features/ai/hooks/useChat";
import { REPORT_TEMPLATES, ReportType } from "@/features/ai/lib/report-templates";
import { generateDocx } from "@/features/ai/lib/docx-generator";

interface AIReportGeneratorProps {
    open: boolean;
    onClose: () => void;
}

export default function AIReportGenerator({ open, onClose }: AIReportGeneratorProps) {
    const [activeTab, setActiveTab] = useState<ReportType>("monthly");
    const [generatedContent, setGeneratedContent] = useState<string>("");
    const [isGenerating, setIsGenerating] = useState(false);

    // Form States
    const [selectedMonth, setSelectedMonth] = useState("2026년 3월");
    const [orgCode, setOrgCode] = useState("");
    const [monitoringLog, setMonitoringLog] = useState("");

    // Initialize chat with the current tab's template
    const { sendMessage } = useChat(REPORT_TEMPLATES[activeTab].systemPrompt);

    if (!open) return null;

    const handleGenerate = async () => {
        setIsGenerating(true);
        setGeneratedContent("");

        try {
            const template = REPORT_TEMPLATES[activeTab];
            let userPrompt = "";

            // Prepare prompt based on tab
            if (activeTab === "monthly") {
                // Mock data for demonstration - in real app, fetch from useMapData
                const mockData = {
                    month: selectedMonth,
                    total: 59,
                    submitted: 45,
                    unsubmitted: 14,
                    regions: ["창원시", "진주시", "김해시"],
                };
                userPrompt = template.userPrompt(mockData);
            } else if (activeTab === "monitoring") {
                userPrompt = template.userPrompt(monitoringLog);
            } else if (activeTab === "evaluation") {
                // Mock data
                const mockData = {
                    name: "동진노인통합지원센터",
                    region: "창원시",
                    users: 450,
                    achievementRate: 98,
                    safetyGearRate: 100,
                    workers: 28,
                };
                userPrompt = template.userPrompt(mockData);
            }

            // Call AI
            // Note: useChat might need adjustment to handle single-turn generation without chat history
            // For now, we'll simulate or use a direct call if useChat supports it. 
            // If useChat is strictly for chat, we might need a separate 'generateText' function.
            // Assuming sendMessage returns a promise with the response message

            // FIXME: useChat might not return the message directly. 
            // We'll use a direct fetch to the AI endpoint or simulate if keys are missing.
            const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

            if (!apiKey) {
                // Mock Response
                await new Promise(resolve => setTimeout(resolve, 2000));
                setGeneratedContent(`# ${template.title} 초안\n\n## 1. 개요\nAI가 생성한 ${template.title} 예시입니다.\n\n## 2. 상세 내용\n- 항목 1: 양호\n- 항목 2: 개선 필요\n\n## 3. 결론\n지속적인 모니터링이 요구됩니다.`);
            } else {
                // Real API Call (Simplified)
                // This part would ideally use the same infrastructure as useChat
                // For this implementation, we will use the mock fallback primarily 
                // to verify the document generation flow first.
                await new Promise(resolve => setTimeout(resolve, 2000));
                setGeneratedContent(`# ${template.title} (Live Demo)\n\n데이터 기반 자동 생성된 보고서입니다.`);
            }

        } catch (error) {
            console.error("Generation failed", error);
            setGeneratedContent("오류가 발생했습니다. 다시 시도해주세요.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = async () => {
        if (!generatedContent) return;
        await generateDocx(REPORT_TEMPLATES[activeTab].title, generatedContent);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <Card className="w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Wand2 className="h-5 w-5 text-purple-600" />
                            AI 행정 보고서 작성 도우미
                        </CardTitle>
                        <CardDescription>
                            데이터를 기반으로 공문서 초안을 자동으로 생성합니다.
                        </CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-5 w-5" />
                    </Button>
                </CardHeader>

                <CardContent className="flex-1 overflow-hidden p-0 flex">
                    {/* Left: Input Panel */}
                    <div className="w-1/3 border-r bg-gray-50/50 p-4 flex flex-col gap-4">
                        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ReportType)} className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="monthly">월간보고</TabsTrigger>
                                <TabsTrigger value="evaluation">기관평가</TabsTrigger>
                                <TabsTrigger value="monitoring">모니터링</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <div className="flex-1 overflow-y-auto py-4">
                            {activeTab === "monthly" && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">대상 월 선택</label>
                                        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="2026년 3월">2026년 3월</SelectItem>
                                                <SelectItem value="2026년 2월">2026년 2월</SelectItem>
                                                <SelectItem value="2026년 1월">2026년 1월</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        선택한 월의 대시보드 데이터를 자동으로 집계하여 보고서를 작성합니다.
                                    </p>
                                </div>
                            )}

                            {activeTab === "evaluation" && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">기관 코드</label>
                                        <Input
                                            placeholder="예: A48120001"
                                            value={orgCode}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrgCode(e.target.value)}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        입력한 기관의 성과 데이터를 분석하여 평가 의견서를 작성합니다.
                                    </p>
                                </div>
                            )}

                            {activeTab === "monitoring" && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">현장 방문 메모</label>
                                        <Textarea
                                            className="h-40 resize-none"
                                            placeholder="방문 일시, 면담 내용, 특이사항 등을 자유롭게 입력하세요."
                                            value={monitoringLog}
                                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMonitoringLog(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <Button
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                            size="lg"
                            onClick={handleGenerate}
                            disabled={isGenerating}
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    초안 생성 중...
                                </>
                            ) : (
                                <>
                                    <Wand2 className="mr-2 h-4 w-4" />
                                    초안 생성 시작
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Right: Output Preview */}
                    <div className="w-2/3 p-6 flex flex-col bg-white">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                <FileText className="h-4 w-4 text-gray-500" />
                                생성된 초안 미리보기
                            </h3>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDownload}
                                disabled={!generatedContent}
                            >
                                <Download className="mr-2 h-4 w-4" />
                                Word(.docx)로 저장
                            </Button>
                        </div>
                        <div className="flex-1 border rounded-lg p-6 bg-gray-50 overflow-y-auto shadow-inner">
                            {generatedContent ? (
                                <div className="prose prose-sm max-w-none whitespace-pre-wrap font-serif">
                                    {generatedContent}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                    <Wand2 className="h-12 w-12 mb-4 opacity-20" />
                                    <p>왼쪽 패널에서 옵션을 선택하고<br />'초안 생성 시작'을 클릭하세요.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
