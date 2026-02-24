import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Sparkles, Send, Trash2, History, ChevronLeft, Trash, Lightbulb, Users } from "lucide-react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useChat } from "../hooks/useChat";
import { useNomaMemory } from "../hooks/useNomaMemory";
import { buildSystemPrompt, isExtendedRequest } from "../lib/ai-context-builder";
import SuggestedQuestions from "./SuggestedQuestions";
import { DiscussionCard, ChatHeader, groupIntoTurns } from "./TripleDiscussion";
import { useRegionStats } from "@/features/map/hooks/useRegionStats";
import { useSurveys, useAvailableMonths } from "@/features/map/hooks/useMapData";
import { useClimateData } from "@/features/climate/hooks/useClimateData";
import { useClimateRegionStats } from "@/features/climate/hooks/useClimateRegionStats";
import { useDisasterData } from "@/features/disaster/hooks/useDisasterData";
import { useDisasterRegionStats } from "@/features/disaster/hooks/useDisasterRegionStats";
import { useCareStatusByRegion } from "@/features/climate/hooks/useCareStatusByRegion";
import { fetchBasePromptSections } from "../lib/ai-api";

function NomaPopupInner() {
    const [input, setInput] = useState("");
    const [basePromptSections, setBasePromptSections] = useState<Record<string, string>>({});
    const [showHistory, setShowHistory] = useState(false);
    const [feedbackMap, setFeedbackMap] = useState<Record<string, "up" | "down">>({});
    const [activeTab, setActiveTab] = useState<string>(() => {
        try { return localStorage.getItem("noma_active_tab") ?? "care"; } catch { return "care"; }
    });
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const { sessions, saveSession, saveActiveSession, loadActiveSession, deleteSession, saveFeedback, feedbackContext } = useNomaMemory();

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

    const messagesHistoryRef = useRef<string[]>([]);

    const getSystemPrompt = useCallback(
        (message: string) => {
            const extended = isExtendedRequest(message);
            return (
                buildSystemPrompt(
                    careStats, climateStats, disasterStats, careStatusByRegion,
                    { activeTab: activeTab as any, actionHistory: messagesHistoryRef.current },
                    surveys ?? undefined,
                    undefined,
                    extended,
                    basePromptSections
                ) + feedbackContext
            );
        },
        [careStats, climateStats, disasterStats, careStatusByRegion, activeTab, surveys, feedbackContext, basePromptSections]
    );

    const { messages, isLoading, error, sendMessage, clearMessages, loadMessages } = useChat(getSystemPrompt);

    const discussionTurns = useMemo(() => groupIntoTurns(messages), [messages]);

    // 진행 중인 대화 복원 + 섹션 로드
    useEffect(() => {
        const active = loadActiveSession();
        if (active && active.messages.length >= 2) {
            loadMessages(active.messages);
        }
        fetchBasePromptSections().then(setBasePromptSections);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 메시지 자동 저장 + 행동 이력 ref 동기화
    useEffect(() => {
        if (!isLoading) saveActiveSession(messages, false); // Removed tripleMode concept
        messagesHistoryRef.current = messages
            .filter((m) => m.role === "user")
            .slice(-3)
            .map((m) => m.content);
    }, [messages, isLoading, saveActiveSession]);

    // 스크롤 하단 유지
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    useEffect(() => { inputRef.current?.focus(); }, []);

    // 메인 창 탭 변경 → 팝업 activeTab 동기화
    useEffect(() => {
        const onStorage = (e: StorageEvent) => {
            if (e.key === "noma_active_tab" && e.newValue) setActiveTab(e.newValue);
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);

    // 창 닫힐 때 세션 저장
    useEffect(() => {
        const onUnload = () => { if (messages.length >= 2) saveSession(messages, false); };
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
        if (input.trim()) {
            sendMessage(input);
            setInput("");
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e as any); }
    };

    return (
        <div className="flex flex-col h-screen bg-white">
            {/* ── Header ── */}
            <ChatHeader tabLabel={activeTab}>
                <button onClick={() => setShowHistory(!showHistory)}
                    title="대화 이력"
                    className={`p-1.5 rounded-lg transition-colors ${showHistory ? "text-purple-600 bg-purple-100" : "text-gray-400 hover:text-purple-500"}`}>
                    <History className="h-4 w-4" />
                </button>
                {messages.length > 0 && !showHistory && (
                    <button onClick={clearMessages} title="대화 초기화" className="p-1.5 rounded-lg text-gray-400 hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                    </button>
                )}
            </ChatHeader>

            {/* ── 이력 패널 ── */}
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
                            onClick={() => {
                                loadMessages(s.messages);
                                setShowHistory(false);
                            }}>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                    <p className="text-xs font-medium text-gray-700 truncate">{s.summary}</p>
                                </div>
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
                    {/* ── 메시지 영역 ── */}
                    <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
                        {messages.length === 0 ? (
                            <SuggestedQuestions
                                onSelect={(q) => sendMessage(q)}
                                activeTab="care"
                            />
                        ) : (
                            <div className="space-y-5">
                                {discussionTurns.map((turn) => (
                                    <DiscussionCard
                                        key={turn.user.id}
                                        turn={turn}
                                        onFeedback={handleFeedback}
                                        feedbackMap={feedbackMap}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="mx-3 mb-1 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{error}</div>
                    )}

                    {/* ── 입력 영역 ── */}
                    <form onSubmit={handleSubmit}
                        className="p-3 border-t border-purple-100 bg-gradient-to-r from-purple-50/50 to-indigo-50/50">
                        <div className="flex items-end gap-2 bg-white border rounded-xl p-2 border-purple-200 focus-within:border-purple-400 focus-within:ring-1 focus-within:ring-purple-200">
                            <textarea ref={inputRef} value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="노마에게 대시보드 데이터나 인사이트를 물어보세요..."
                                rows={1}
                                className="flex-1 resize-none border-0 bg-transparent px-2 py-1.5 text-sm focus:outline-none placeholder:text-gray-400"
                                style={{ maxHeight: "80px" }}
                                onInput={(e) => {
                                    const t = e.target as HTMLTextAreaElement;
                                    t.style.height = "auto";
                                    t.style.height = `${Math.min(t.scrollHeight, 80)}px`;
                                }} />
                            <button type="submit" disabled={!input.trim() || isLoading}
                                className="rounded-lg disabled:opacity-40 h-8 w-8 p-0 flex-shrink-0 flex items-center justify-center text-white bg-gradient-to-br from-purple-600 to-indigo-500 hover:from-purple-700 hover:to-indigo-600">
                                <Send className="h-3.5 w-3.5" />
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1.5 text-center">
                            노마 — 데이터 분석 & 시스템 제어 AI
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
