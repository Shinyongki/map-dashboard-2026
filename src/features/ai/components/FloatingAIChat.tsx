import { useState, useRef, useEffect, useMemo } from "react";
import { Sparkles, X, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChat } from "../hooks/useChat";
import { buildSystemPrompt } from "../lib/ai-context-builder";
import type { DashboardTab } from "../lib/ai-types";
import ChatMessage from "./ChatMessage";
import SuggestedQuestions from "./SuggestedQuestions";
import { useRegionStats } from "@/features/map/hooks/useRegionStats";
import { useSurveys, useAvailableMonths } from "@/features/map/hooks/useMapData";
import { useClimateData } from "@/features/climate/hooks/useClimateData";
import { useClimateRegionStats } from "@/features/climate/hooks/useClimateRegionStats";
import { useDisasterData } from "@/features/disaster/hooks/useDisasterData";
import { useDisasterRegionStats } from "@/features/disaster/hooks/useDisasterRegionStats";
import { useCareStatusByRegion } from "@/features/climate/hooks/useCareStatusByRegion";

interface FloatingAIChatProps {
    activeTab?: DashboardTab;
}

const TAB_LABELS: Record<DashboardTab, string> = {
    care: "돌봄현황",
    welfare: "복지자원",
    climate: "기후대응",
    disaster: "자연재난",
    qna: "Q&A",
};

export default function FloatingAIChat({ activeTab = "care" }: FloatingAIChatProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Gather data from all dashboards
    const { data: months } = useAvailableMonths();
    const latestMonth = months?.[0] ?? "";
    const { data: surveys } = useSurveys(latestMonth);
    const { regionStatsMap: careStats } = useRegionStats(surveys);

    const yearRange: [number, number] = [2021, 2025];
    const { data: climateAlerts } = useClimateData(yearRange);
    const climateStats = useClimateRegionStats(climateAlerts, yearRange);

    const { data: disasterAlerts } = useDisasterData(yearRange);
    const disasterStats = useDisasterRegionStats(disasterAlerts, yearRange);

    // Care status by region (복지자원 인프라)
    const { statuses: careStatusByRegion } = useCareStatusByRegion();

    // Extract active alert regions
    const currentYear = yearRange[1];

    const climateAlertRegions = useMemo(() => {
        const regions: string[] = [];
        climateStats.forEach((stats, region) => {
            const yd = stats.yearlyBreakdown.find((y) => y.year === currentYear);
            if (yd && yd.totalCount > 0) regions.push(region);
        });
        return regions;
    }, [climateStats, currentYear]);

    const disasterAlertRegions = useMemo(() => {
        const regions: string[] = [];
        disasterStats.forEach((stats, region) => {
            const yd = stats.yearlyBreakdown.find((y) => y.year === currentYear);
            if (yd && yd.totalCount > 0) regions.push(region);
        });
        return regions;
    }, [disasterStats, currentYear]);

    const systemPrompt = useMemo(
        () =>
            buildSystemPrompt(careStats, climateStats, disasterStats, careStatusByRegion, {
                activeTab,
                climateAlerts: climateAlertRegions,
                disasterAlerts: disasterAlertRegions,
            }),
        [
            careStats,
            climateStats,
            disasterStats,
            careStatusByRegion,
            activeTab,
            climateAlertRegions,
            disasterAlertRegions,
        ]
    );

    const { messages, isLoading, error, sendMessage, clearMessages } =
        useChat(systemPrompt);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Focus input when panel opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim()) {
            sendMessage(input);
            setInput("");
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const handleSuggestionSelect = (question: string) => {
        sendMessage(question);
    };

    return (
        <>
            {/* Floating Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 z-[60] w-14 h-14 rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
                    aria-label="AI 분석 열기"
                >
                    <Sparkles className="h-6 w-6" />
                </button>
            )}

            {/* Chat Panel Overlay */}
            {isOpen && (
                <div className="fixed bottom-6 right-6 z-[60] w-[400px] h-[600px] max-h-[calc(100vh-48px)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-purple-50">
                        <div className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-purple-500" />
                            <h2 className="text-sm font-bold text-gray-800">AI 분석</h2>
                            <span className="text-[10px] text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full font-medium">
                                {TAB_LABELS[activeTab]}
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            {messages.length > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearMessages}
                                    className="text-gray-400 hover:text-red-500 h-8 w-8 p-0"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsOpen(false)}
                                className="text-gray-400 hover:text-gray-600 h-8 w-8 p-0"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Messages area */}
                    <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
                        {messages.length === 0 ? (
                            <SuggestedQuestions
                                onSelect={handleSuggestionSelect}
                                activeTab={activeTab}
                            />
                        ) : (
                            <div className="space-y-4">
                                {messages.map((msg) => (
                                    <ChatMessage key={msg.id} message={msg} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Error display */}
                    {error && (
                        <div className="mx-3 mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
                            {error}
                        </div>
                    )}

                    {/* Input area */}
                    <form onSubmit={handleSubmit} className="p-3 border-t border-gray-100">
                        <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-xl p-2 focus-within:border-purple-300 focus-within:ring-1 focus-within:ring-purple-200">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="경남 돌봄·복지·기후·재난에 대해 질문해보세요..."
                                rows={1}
                                className="flex-1 resize-none border-0 bg-transparent px-2 py-1.5 text-sm focus:outline-none placeholder:text-gray-400"
                                style={{ maxHeight: "80px" }}
                                onInput={(e) => {
                                    const target = e.target as HTMLTextAreaElement;
                                    target.style.height = "auto";
                                    target.style.height = `${Math.min(target.scrollHeight, 80)}px`;
                                }}
                            />
                            <Button
                                type="submit"
                                size="sm"
                                disabled={!input.trim() || isLoading}
                                className="rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-40 h-8 w-8 p-0 flex-shrink-0"
                            >
                                <Send className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1.5 text-center">
                            AI 분석은 대시보드 데이터를 기반으로 하며, 실제 통계와 다를 수 있습니다
                        </p>
                    </form>
                </div>
            )}
        </>
    );
}
