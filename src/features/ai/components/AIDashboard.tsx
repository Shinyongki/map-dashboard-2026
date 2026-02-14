import { useState, useRef, useEffect, useMemo } from "react";
import { Send, Trash2, Sparkles } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useChat } from "../hooks/useChat";
import { buildSystemPrompt } from "../lib/ai-context-builder";
import ChatMessage from "./ChatMessage";
import SuggestedQuestions from "./SuggestedQuestions";
import { useRegionStats } from "@/features/map/hooks/useRegionStats";
import { useSurveys, useAvailableMonths } from "@/features/map/hooks/useMapData";
import { useClimateData } from "@/features/climate/hooks/useClimateData";
import { useClimateRegionStats } from "@/features/climate/hooks/useClimateRegionStats";
import { useDisasterData } from "@/features/disaster/hooks/useDisasterData";
import { useDisasterRegionStats } from "@/features/disaster/hooks/useDisasterRegionStats";

export default function AIDashboard() {
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

    const systemPrompt = useMemo(
        () => buildSystemPrompt(careStats, climateStats, disasterStats),
        [careStats, climateStats, disasterStats]
    );

    const { messages, isLoading, error, sendMessage, clearMessages } =
        useChat(systemPrompt);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

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
        <div className="max-w-4xl mx-auto px-4 py-6 h-[calc(100vh-64px)] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    <h1 className="text-lg font-bold text-gray-800">AI 분석</h1>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        Claude Sonnet
                    </span>
                </div>
                {messages.length > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearMessages}
                        className="text-gray-400 hover:text-red-500"
                    >
                        <Trash2 className="h-4 w-4 mr-1" />
                        초기화
                    </Button>
                )}
            </div>

            {/* Messages area */}
            <ScrollArea className="flex-1 pr-2" ref={scrollRef}>
                {messages.length === 0 ? (
                    <SuggestedQuestions onSelect={handleSuggestionSelect} />
                ) : (
                    <div className="space-y-4 pb-4">
                        {messages.map((msg) => (
                            <ChatMessage key={msg.id} message={msg} />
                        ))}
                    </div>
                )}
            </ScrollArea>

            {/* Error display */}
            {error && (
                <div className="mx-2 mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                    {error}
                </div>
            )}

            {/* Input area */}
            <form onSubmit={handleSubmit} className="mt-2">
                <div className="flex items-end gap-2 bg-white border border-gray-200 rounded-2xl p-2 shadow-sm focus-within:border-purple-300 focus-within:ring-1 focus-within:ring-purple-200">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="경남 돌봄·기후·재난에 대해 질문해보세요..."
                        rows={1}
                        className="flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm focus:outline-none placeholder:text-gray-400"
                        style={{ maxHeight: "120px" }}
                        onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = "auto";
                            target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                        }}
                    />
                    <Button
                        type="submit"
                        size="sm"
                        disabled={!input.trim() || isLoading}
                        className="rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 h-9 w-9 p-0 flex-shrink-0"
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
                <p className="text-xs text-gray-400 mt-1.5 text-center">
                    AI 분석은 대시보드 데이터를 기반으로 하며, 실제 통계와 다를 수 있습니다
                </p>
            </form>
        </div>
    );
}
