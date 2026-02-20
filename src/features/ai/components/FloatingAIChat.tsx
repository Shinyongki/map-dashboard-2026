import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Sparkles, X, Send, Trash2, History, ChevronLeft, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChat } from "../hooks/useChat";
import { useNomaMemory } from "../hooks/useNomaMemory";
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
    const [showHistory, setShowHistory] = useState(false);
    const [feedbackMap, setFeedbackMap] = useState<Record<string, "up" | "down">>({});
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // 노마 메모리 (이력 + 피드백)
    const { sessions, saveSession, deleteSession, saveFeedback, feedbackContext } = useNomaMemory();

    // 대시보드 데이터
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

    const climateAlertRegions = useMemo(() => {
        const regions: string[] = [];
        climateStats.forEach((stats, region) => {
            const yd = stats.yearlyBreakdown.find((y) => y.year === yearRange[1]);
            if (yd && yd.totalCount > 0) regions.push(region);
        });
        return regions;
    }, [climateStats]);

    const disasterAlertRegions = useMemo(() => {
        const regions: string[] = [];
        disasterStats.forEach((stats, region) => {
            const yd = stats.yearlyBreakdown.find((y) => y.year === yearRange[1]);
            if (yd && yd.totalCount > 0) regions.push(region);
        });
        return regions;
    }, [disasterStats]);

    const systemPrompt = useMemo(
        () =>
            buildSystemPrompt(
                careStats, climateStats, disasterStats, careStatusByRegion,
                { activeTab, climateAlerts: climateAlertRegions, disasterAlerts: disasterAlertRegions },
                surveys ?? undefined
            ) + feedbackContext,
        [careStats, climateStats, disasterStats, careStatusByRegion, activeTab,
         climateAlertRegions, disasterAlertRegions, surveys, feedbackContext]
    );

    const { messages, isLoading, error, sendMessage, clearMessages, loadMessages } =
        useChat(systemPrompt);

    // 패널 닫을 때 세션 저장
    const handleClose = useCallback(() => {
        if (messages.length >= 2) {
            saveSession(messages);
        }
        setIsOpen(false);
        setShowHistory(false);
    }, [messages, saveSession]);

    // 과거 세션 불러오기
    const handleRestoreSession = useCallback((sessionId: string) => {
        const session = sessions.find((s) => s.id === sessionId);
        if (session) {
            loadMessages(session.messages);
            setShowHistory(false);
        }
    }, [sessions, loadMessages]);

    // 피드백 처리
    const handleFeedback = useCallback((type: "up" | "down", messageId: string) => {
        setFeedbackMap((prev) => ({ ...prev, [messageId]: type }));
        if (type === "up") {
            const assistantMsg = messages.find((m) => m.id === messageId);
            const msgIndex = messages.findIndex((m) => m.id === messageId);
            const prevUser = messages.slice(0, msgIndex).reverse().find((m) => m.role === "user");
            if (assistantMsg && prevUser) {
                saveFeedback(prevUser.content, assistantMsg.content);
            }
        }
    }, [messages, saveFeedback]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

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

    return (
        <>
            {/* Floating Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 z-[60] w-14 h-14 rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
                    aria-label="노마 열기"
                >
                    <Sparkles className="h-6 w-6" />
                </button>
            )}

            {/* Chat Panel */}
            {isOpen && (
                <div className="fixed bottom-6 right-6 z-[60] w-[400px] h-[600px] max-h-[calc(100vh-48px)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">

                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-purple-50">
                        <div className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-purple-500" />
                            <div>
                                <h2 className="text-sm font-bold text-gray-800 leading-tight">노마</h2>
                                <p className="text-[10px] text-purple-500 leading-tight">NOde Management Assistant</p>
                            </div>
                            <span className="text-[10px] text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full font-medium ml-1">
                                {TAB_LABELS[activeTab]}
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            {/* 이력 버튼 */}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowHistory(!showHistory)}
                                title="대화 이력"
                                className={`h-8 w-8 p-0 ${showHistory ? "text-purple-600 bg-purple-100" : "text-gray-400 hover:text-purple-500"}`}
                            >
                                <History className="h-4 w-4" />
                            </Button>
                            {messages.length > 0 && !showHistory && (
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
                                onClick={handleClose}
                                className="text-gray-400 hover:text-gray-600 h-8 w-8 p-0"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* 이력 패널 */}
                    {showHistory ? (
                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                            <div className="flex items-center gap-2 mb-3">
                                <button
                                    onClick={() => setShowHistory(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <p className="text-sm font-semibold text-gray-700">대화 이력</p>
                                <span className="text-xs text-gray-400">최근 {sessions.length}개 세션</span>
                            </div>
                            {sessions.length === 0 ? (
                                <p className="text-xs text-center text-gray-400 py-8">저장된 대화가 없습니다.</p>
                            ) : (
                                sessions.map((s) => (
                                    <div
                                        key={s.id}
                                        className="flex items-start gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-purple-200 cursor-pointer group"
                                        onClick={() => handleRestoreSession(s.id)}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-gray-700 truncate">{s.summary}</p>
                                            <p className="text-[10px] text-gray-400 mt-0.5">
                                                {new Date(s.startedAt).toLocaleString("ko-KR", {
                                                    month: "short", day: "numeric",
                                                    hour: "2-digit", minute: "2-digit",
                                                })}
                                                {" · "}{s.messages.length}개 메시지
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                                            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-opacity flex-shrink-0"
                                        >
                                            <Trash className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <>
                            {/* 메시지 영역 */}
                            <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
                                {messages.length === 0 ? (
                                    <SuggestedQuestions
                                        onSelect={(q) => sendMessage(q)}
                                        activeTab={activeTab}
                                    />
                                ) : (
                                    <div className="space-y-4">
                                        {messages.map((msg, idx) => {
                                            const prevUser = messages
                                                .slice(0, idx)
                                                .reverse()
                                                .find((m) => m.role === "user");
                                            return (
                                                <ChatMessage
                                                    key={msg.id}
                                                    message={msg}
                                                    prevUserContent={prevUser?.content}
                                                    onFeedback={handleFeedback}
                                                    feedbackGiven={feedbackMap[msg.id] ?? null}
                                                />
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {error && (
                                <div className="mx-3 mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
                                    {error}
                                </div>
                            )}

                            {/* 입력 영역 */}
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
                                    노마는 대시보드 데이터와 지식베이스를 기반으로 분석합니다
                                </p>
                            </form>
                        </>
                    )}
                </div>
            )}
        </>
    );
}
