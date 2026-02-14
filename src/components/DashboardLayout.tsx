import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MapPin, CloudSun, AlertTriangle, BotMessageSquare } from "lucide-react";
import MapDashboard from "@/features/map/components/MapDashboard";
import ClimateDashboard from "@/features/climate/components/ClimateDashboard";
import DisasterDashboard from "@/features/disaster/components/DisasterDashboard";
import AIDashboard from "@/features/ai/components/AIDashboard";

type DashboardTab = "care" | "climate" | "disaster" | "ai";

export default function DashboardLayout() {
    const [activeTab, setActiveTab] = useState<DashboardTab>("care");

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4">
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DashboardTab)}>
                        <TabsList className="h-12 bg-transparent gap-1 p-0">
                            <TabsTrigger
                                value="care"
                                className="h-10 px-4 gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none rounded-lg"
                            >
                                <MapPin className="h-4 w-4" />
                                <span className="font-semibold">돌봄현황</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="climate"
                                className="h-10 px-4 gap-2 data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700 data-[state=active]:shadow-none rounded-lg"
                            >
                                <CloudSun className="h-4 w-4" />
                                <span className="font-semibold">기후대응</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="disaster"
                                className="h-10 px-4 gap-2 data-[state=active]:bg-red-50 data-[state=active]:text-red-700 data-[state=active]:shadow-none rounded-lg"
                            >
                                <AlertTriangle className="h-4 w-4" />
                                <span className="font-semibold">자연재난</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="ai"
                                className="h-10 px-4 gap-2 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 data-[state=active]:shadow-none rounded-lg"
                            >
                                <BotMessageSquare className="h-4 w-4" />
                                <span className="font-semibold">AI 분석</span>
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="care" className="mt-0">
                            <div />
                        </TabsContent>
                        <TabsContent value="climate" className="mt-0">
                            <div />
                        </TabsContent>
                        <TabsContent value="disaster" className="mt-0">
                            <div />
                        </TabsContent>
                        <TabsContent value="ai" className="mt-0">
                            <div />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
            {activeTab === "care" && <MapDashboard />}
            {activeTab === "climate" && <ClimateDashboard />}
            {activeTab === "disaster" && <DisasterDashboard />}
            {activeTab === "ai" && <AIDashboard />}
        </div>
    );
}
