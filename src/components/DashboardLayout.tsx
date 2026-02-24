import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MapPin, CloudSun, AlertTriangle, Building, MessageSquareText, FileText, Search, Layers, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import SectorSettings from "@/features/qna/components/SectorSettings";
import MapDashboard from "@/features/map/components/MapDashboard";
import WelfareMap from "@/features/welfare/components/WelfareMap";
import ClimateDashboard from "@/features/climate/components/ClimateDashboard";
import DisasterDashboard from "@/features/disaster/components/DisasterDashboard";
import FloatingAIChat from "@/features/ai/components/FloatingAIChat";
import QnADashboard from "@/features/qna/components/QnADashboard";
import AIReportGenerator from "@/features/ai/components/AIReportGenerator";
import DocumentFeedback from "@/features/ai/components/DocumentFeedback";

type DashboardTab = "care" | "welfare" | "climate" | "disaster" | "qna";
type SectorKey = "welfare" | "climate" | "disaster";

function loadHiddenSectors(): SectorKey[] {
    try { return JSON.parse(localStorage.getItem("hidden_sectors") || "[]"); } catch { return []; }
}

export default function DashboardLayout() {
    const [activeTab, setActiveTab] = useState<DashboardTab>("care");
    const [showReportGenerator, setShowReportGenerator] = useState(false);
    const [showDocumentFeedback, setShowDocumentFeedback] = useState(false);
    const [showSectorSettings, setShowSectorSettings] = useState(false);
    const [hiddenSectors, setHiddenSectors] = useState<SectorKey[]>(loadHiddenSectors);

    useEffect(() => {
        const handler = () => setHiddenSectors(loadHiddenSectors());
        window.addEventListener("sectors-changed", handler);
        window.addEventListener("storage", handler);
        return () => { window.removeEventListener("sectors-changed", handler); window.removeEventListener("storage", handler); };
    }, []);

    const show = (key: SectorKey) => !hiddenSectors.includes(key);


    return (
        <div className="min-h-screen bg-gray-50">
            <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4">
                    <Tabs value={activeTab} onValueChange={(v) => {
                        const tab = v as DashboardTab;
                        setActiveTab(tab);
                        try { localStorage.setItem("noma_active_tab", tab); } catch { /* ignore */ }
                    }}>
                        <TabsList className="h-12 bg-transparent gap-1 p-0">
                            <TabsTrigger
                                value="care"
                                className="h-10 px-4 gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none rounded-lg"
                            >
                                <MapPin className="h-4 w-4" />
                                <span className="font-semibold">돌봄현황</span>
                            </TabsTrigger>
                            {show("welfare") && (
                                <TabsTrigger
                                    value="welfare"
                                    className="h-10 px-4 gap-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:shadow-none rounded-lg"
                                >
                                    <Building className="h-4 w-4" />
                                    <span className="font-semibold">복지자원</span>
                                </TabsTrigger>
                            )}
                            {show("climate") && (
                                <TabsTrigger
                                    value="climate"
                                    className="h-10 px-4 gap-2 data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700 data-[state=active]:shadow-none rounded-lg"
                                >
                                    <CloudSun className="h-4 w-4" />
                                    <span className="font-semibold">기후대응</span>
                                </TabsTrigger>
                            )}
                            {show("disaster") && (
                                <TabsTrigger
                                    value="disaster"
                                    className="h-10 px-4 gap-2 data-[state=active]:bg-red-50 data-[state=active]:text-red-700 data-[state=active]:shadow-none rounded-lg"
                                >
                                    <AlertTriangle className="h-4 w-4" />
                                    <span className="font-semibold">자연재난</span>
                                </TabsTrigger>
                            )}
                            <TabsTrigger
                                value="qna"
                                className="h-10 px-4 gap-2 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 data-[state=active]:shadow-none rounded-lg"
                            >
                                <MessageSquareText className="h-4 w-4" />
                                <span className="font-semibold">Q&A</span>
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="care" className="mt-0">
                            <div />
                        </TabsContent>
                        <TabsContent value="welfare" className="mt-0">
                            <div />
                        </TabsContent>
                        <TabsContent value="climate" className="mt-0">
                            <div />
                        </TabsContent>
                        <TabsContent value="disaster" className="mt-0">
                            <div />
                        </TabsContent>
                        <TabsContent value="qna" className="mt-0">
                            <div />
                        </TabsContent>
                    </Tabs>
                    <div className="absolute top-2 right-4 flex gap-2">
                        <div className="relative">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowSectorSettings(v => !v)}
                                className={`bg-white/80 backdrop-blur-sm gap-2 shadow-sm ${showSectorSettings ? "border-gray-400 text-gray-800 bg-gray-50" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}
                            >
                                <Layers className="h-4 w-4" />
                                <span className="font-semibold">섹터 설정</span>
                            </Button>
                            {showSectorSettings && (
                                <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-200 p-4 z-50">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm font-bold text-gray-800">섹터 노출 설정</span>
                                        <button onClick={() => setShowSectorSettings(false)} className="p-1 hover:bg-gray-100 rounded-full text-gray-400">
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <SectorSettings />
                                </div>
                            )}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowDocumentFeedback(true)}
                            className="bg-white/80 backdrop-blur-sm border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800 gap-2 shadow-sm"
                        >
                            <Search className="h-4 w-4" />
                            <span className="font-semibold">공문서 검토</span>
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowReportGenerator(true)}
                            className="bg-white/80 backdrop-blur-sm border-purple-200 text-purple-700 hover:bg-purple-50 hover:text-purple-800 gap-2 shadow-sm"
                        >
                            <FileText className="h-4 w-4" />
                            <span className="font-semibold">AI 보고서 작성</span>
                        </Button>
                    </div>
                </div>
            </div>
            {activeTab === "care" && <MapDashboard />}
            {activeTab === "welfare" && show("welfare") && <WelfareMap />}
            {activeTab === "climate" && show("climate") && <ClimateDashboard />}
            {activeTab === "disaster" && show("disaster") && <DisasterDashboard />}
            {activeTab === "qna" && <QnADashboard />}
            <FloatingAIChat activeTab={activeTab} />
            <AIReportGenerator open={showReportGenerator} onClose={() => setShowReportGenerator(false)} />
            <DocumentFeedback open={showDocumentFeedback} onClose={() => setShowDocumentFeedback(false)} />
        </div>
    );

}
