import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Sparkles, Send, Trash2, History, ChevronLeft, Trash, Lightbulb } from "lucide-react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useChat } from "../hooks/useChat";
import { useNomaMemory } from "../hooks/useNomaMemory";
import { buildSystemPrompt } from "../lib/ai-context-builder";
import ChatMessage from "./ChatMessage";
import SuggestedQuestions from "./SuggestedQuestions";
import { useRegionStats } from "@/features/map/hooks/useRegionStats";
import { useSurveys, useAvailableMonths } from "@/features/map/hooks/useMapData";
import { useClimateData } from "@/features/climate/hooks/useClimateData";
import { useClimateRegionStats } from "@/features/climate/hooks/useClimateRegionStats";
import { useDisasterData } from "@/features/disaster/hooks/useDisasterData";
import { useDisasterRegionStats } from "@/features/disaster/hooks/useDisasterRegionStats";
import { useCareStatusByRegion } from "@/features/climate/hooks/useCareStatusByRegion";

function NomaPopupInner() {
    const [input, setInput] = useState("");
    const [showHistory, setShowHistory] = useState(false);
    const [feedbackMap, setFeedbackMap] = useState<Record<string, "up" | "down">>({});
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const { sessions, saveSession, deleteSession, saveFeedback, feedbackContext } = useNomaMemory();

    const { data: months } = useAvailableMonths();
    const latestMonth = months?.[0] ?? "";
    const { data: surveys } = useSurveys(latestMonth);
    const { regionStatsMap: careStats } = useRegionStats(surveys);
    const yearRange: [number, number] = [2021, 2025];
    const { data: climateAlerts } = useClimateData(yearRange);
    const climateStats = useClimateRegionStats(climateAlerts, yearRange);
    const { data: disasterAlerts } = useDisasterData(yearRange);
    const disasterStats = useDisasterRegionStats(disasterAlerts, yearRange);
    const { statuses: careStatusByRegion } = useCareStatusByRegion();

    const systemPrompt = useMemo(
        () =>
            buildSystemPrompt(careStats, climateStats, disasterStats, careStatusByRegion,
                { activeTab: "care" }, surveys ?? undefined) + feedbackContext,
        [careStats, climateStats, disasterStats, careStatusByRegion, surveys, feedbackContext]
    );

    const { messages, isLoading, error, sendMessage, clearMessages, loadMessages } = useChat(systemPrompt);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // 창 닫힐 때 세션 저장
    useEffect(() => {
        const onUnload = () => { if (messages.length >= 2) saveSession(messages); };
        window.addEventListener("beforeunload", onUnload);
        return () => window.removeEventListener("beforeunload", onUnload);
    }, [messages, saveSession]);

    const handleFeedback = useCallback((type: "up" | "down", messageId: string) => {
        setFeedbackMap((prev) => ({ ...prev, [messageId]: type }));
        if (type === "up") {
            const assistantMsg = messages.find((m) => m.id === messageId);
            const idx = messages.findIndex((m) => m.id === messageId);
            const prevUser = messages.slice(0, idx).reverse().find((m) => m.role === "user");
            if (assistantMsg && prevUser) saveFeedback(prevUser.content, assistantMsg.content);
        }
    }, [messages, saveFeedback]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim()) { sendMessage(input); setInput(""); }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e as any); }
    };

    return (
        <div className="flex flex-col h-screen bg-white">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-purple-50 cursor-move select-none">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    <div>
                        <h2 className="text-sm font-bold text-gray-800 leading-tight">노마</h2>
                        <p className="text-[10px] text-purple-500 leading-tight">NOde Management Assistant</p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => setShowHistory(!showHistory)}
                        className={`p-1.5 rounded-lg transition-colors ${showHistory ? "text-purple-600 bg-purple-100" : "text-gray-400 hover:text-purple-500"}`}>
                        <History className="h-4 w-4" />
                    </button>
                    {messages.length > 0 && !showHistory && (
                        <button onClick={clearMessages} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500">
                            <Trash2 className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            {showHistory ? (
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    <div className="flex items-center gap-2 mb-3">
                        <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600">
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <p className="text-sm font-semibold text-gray-700">대화 이력 ({sessions.length}개)</p>
                    </div>
                    {sessions.length === 0 ? (
                        <p className="text-xs text-center text-gray-400 py-8">저장된 대화가 없습니다.</p>
                    ) : sessions.map((s) => (
                        <div key={s.id}
                            className="flex items-start gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-purple-200 cursor-pointer group"
                            onClick={() => { loadMessages(s.messages); setShowHistory(false); }}>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-gray-700 truncate">{s.summary}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                    {new Date(s.startedAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                    {" · "}{s.messages.length}개 메시지
                                </p>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400">
                                <Trash className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <>
                    <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
                        {messages.length === 0 ? (
                            <SuggestedQuestions onSelect={sendMessage} activeTab="care" />
                        ) : (
                            <div className="space-y-4">
                                {messages.map((msg, idx) => {
                                    const prevUser = messages.slice(0, idx).reverse().find((m) => m.role === "user");
                                    return (
                                        <ChatMessage key={msg.id} message={msg}
                                            prevUserContent={prevUser?.content}
                                            onFeedback={handleFeedback}
                                            feedbackGiven={feedbackMap[msg.id] ?? null} />
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="mx-3 mb-1 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{error}</div>
                    )}

                    {messages.length > 0 && (
                        <div className="px-3 pb-1">
                            <button
                                onClick={() => sendMessage("현재 시스템 데이터와 운영 현황을 분석해서 가장 시급한 시스템 개선 제안 3가지를 [💡 개선 제안] 형식으로 구체적으로 제시해줘")}
                                disabled={isLoading}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors text-xs text-amber-800 font-medium disabled:opacity-50">
                                <Lightbulb className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                                노마에게 시스템 개선 제안 받기
                            </button>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="p-3 border-t border-gray-100">
                        <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-xl p-2 focus-within:border-purple-300 focus-within:ring-1 focus-within:ring-purple-200">
                            <textarea ref={inputRef} value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="질문을 입력하세요... (Enter 전송)"
                                rows={1}
                                className="flex-1 resize-none border-0 bg-transparent px-2 py-1.5 text-sm focus:outline-none placeholder:text-gray-400"
                                style={{ maxHeight: "80px" }}
                                onInput={(e) => {
                                    const t = e.target as HTMLTextAreaElement;
                                    t.style.height = "auto";
                                    t.style.height = `${Math.min(t.scrollHeight, 80)}px`;
                                }} />
                            <button type="submit" disabled={!input.trim() || isLoading}
                                className="rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-40 h-8 w-8 p-0 flex-shrink-0 flex items-center justify-center text-white">
                                <Send className="h-3.5 w-3.5" />
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1.5 text-center">
                            노마 — 경남 노인맞춤돌봄서비스 통합관리 AI
                        </p>
                    </form>
                </>
            )}
        </div>
    );
}

export default function NomaPopupPage() {
    return (
        <QueryClientProvider client={queryClient}>
            <NomaPopupInner />
        </QueryClientProvider>
    );
}
