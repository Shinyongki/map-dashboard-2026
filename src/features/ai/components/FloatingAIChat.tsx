import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Sparkles, X, Send, Trash2, History, ChevronLeft, Trash, Lightbulb, ExternalLink, Bot, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDraggable } from "../hooks/useDraggable";
import { useChat } from "../hooks/useChat";
import { useNomaMemory } from "../hooks/useNomaMemory";
import { buildSystemPrompt, isExtendedRequest } from "../lib/ai-context-builder";
import type { DashboardTab } from "../lib/ai-types";
import SuggestedQuestions from "./SuggestedQuestions";
import { DiscussionCard, ChatHeader, groupIntoTurns } from "./TripleDiscussion";
import { fetchUnifiedSession, clearUnifiedSession, fetchPromptPatches, deletePromptPatch, fetchCodeTasks, deleteCodeTask, fetchBasePromptSections, type UnifiedEntry, type PromptPatch, type CodeTask } from "../lib/ai-api";
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


// ── 메인 컴포넌트 ──────────────────────────────────────────────
export default function FloatingAIChat({ activeTab = "care" }: FloatingAIChatProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState("");
    const [showHistory, setShowHistory] = useState(false);
    const [showUnifiedSession, setShowUnifiedSession] = useState(false);
    const [unifiedEntries, setUnifiedEntries] = useState<UnifiedEntry[]>([]);
    const [promptPatchList, setPromptPatchList] = useState<PromptPatch[]>([]);
    const [basePromptSections, setBasePromptSections] = useState<Record<string, string>>({});
    const [codeTaskList, setCodeTaskList] = useState<CodeTask[]>([]);
    const [feedbackMap, setFeedbackMap] = useState<Record<string, "up" | "down">>({});

    const { pos, onMouseDown } = useDraggable();

    const handlePopout = useCallback(() => {
        const url = `${window.location.origin}${window.location.pathname}?noma=popup`;
        window.open(url, "noma-popup", "width=520,height=700,resizable=yes,scrollbars=no");
        setIsOpen(false);
    }, []);
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

    // 최근 메시지 이력을 ref로 유지 (getSystemPrompt 순환 의존성 방지)
    const messagesHistoryRef = useRef<string[]>([]);

    // 메시지 전송 시점에 평가되는 getter — 키워드 감지로 기본/확장 모드 자동 전환
    const getSystemPrompt = useCallback(
        (message: string) => {
            const extended = isExtendedRequest(message);
            const prompt = buildSystemPrompt(
                careStats, climateStats, disasterStats, careStatusByRegion,
                {
                    activeTab,
                    climateAlerts: climateAlertRegions,
                    disasterAlerts: disasterAlertRegions,
                    actionHistory: messagesHistoryRef.current,
                },
                surveys ?? undefined,
                promptPatchList,
                extended,
                basePromptSections
            ) + feedbackContext;
            return prompt;
        },
        [careStats, climateStats, disasterStats, careStatusByRegion, activeTab,
            climateAlertRegions, disasterAlertRegions, surveys, promptPatchList, feedbackContext, basePromptSections]
    );

    // 🔧 DEV: 콘솔에서 window.__nomaDumpPrompt("care") 로 탭별 실제 프롬프트 확인
    useEffect(() => {
        if (import.meta.env.DEV) {
            (window as any).__nomaDumpPrompt = (tab?: string, extended?: boolean) => {
                const t = tab ?? activeTab;
                const prompt = buildSystemPrompt(
                    careStats, climateStats, disasterStats, careStatusByRegion,
                    { activeTab: t as any, climateAlerts: climateAlertRegions, disasterAlerts: disasterAlertRegions },
                    surveys ?? undefined,
                    promptPatchList,
                    extended ?? false,
                    basePromptSections
                );
                console.group(`📋 노마 systemPrompt [탭: ${t}, 확장: ${extended ?? false}]`);
                console.log(`총 길이: ${prompt.length}자 / 약 ${Math.round(prompt.length / 4)} 토큰`);
                console.log(prompt);
                console.groupEnd();
                return prompt;
            };
        }
    }, [careStats, climateStats, disasterStats, careStatusByRegion, activeTab,
        climateAlertRegions, disasterAlertRegions, surveys, promptPatchList, basePromptSections]);

    const { messages, isLoading, error, sendMessage, clearMessages, loadMessages } =
        useChat(getSystemPrompt);

    // 진행 중인 대화 복원 + 프롬프트 패치 로드 (첫 마운트 시)
    useEffect(() => {
        const active = loadActiveSession();
        if (active && active.messages.length >= 2) {
            loadMessages(active.messages);
        }
        fetchPromptPatches().then(setPromptPatchList);
        fetchCodeTasks().then(setCodeTaskList);
        fetchBasePromptSections().then(setBasePromptSections);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 메시지 변경 시 자동 저장 + 행동 이력 ref 동기화
    useEffect(() => {
        if (!isLoading) saveActiveSession(messages, true); // true for compatibility with storage
        messagesHistoryRef.current = messages
            .filter((m) => m.role === "user")
            .slice(-3)
            .map((m) => m.content);
    }, [messages, isLoading, saveActiveSession]);

    const handleClose = useCallback(() => {
        if (messages.length >= 2) saveSession(messages, true); // true for compatibility
        setIsOpen(false);
        setShowHistory(false);
        setShowUnifiedSession(false);
    }, [messages, saveSession]);

    const handleToggleUnifiedSession = useCallback(async () => {
        if (!showUnifiedSession) {
            const [entries, patches, tasks, sections] = await Promise.all([
                fetchUnifiedSession(),
                fetchPromptPatches(),
                fetchCodeTasks(),
                fetchBasePromptSections(),
            ]);
            setUnifiedEntries(entries);
            setPromptPatchList(patches);
            setCodeTaskList(tasks);
            setBasePromptSections(sections);
        }
        setShowUnifiedSession((v) => !v);
        setShowHistory(false);
    }, [showUnifiedSession]);

    const handleClearUnifiedSession = useCallback(async () => {
        await clearUnifiedSession();
        setUnifiedEntries([]);
    }, []);

    const handleDeletePatch = useCallback(async (id: string) => {
        const ok = await deletePromptPatch(id);
        if (ok) setPromptPatchList((prev) => prev.filter((p) => p.id !== id));
    }, []);

    const handleDeleteCodeTask = useCallback(async (id: string) => {
        const ok = await deleteCodeTask(id);
        if (ok) setCodeTaskList((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const handleRestoreSession = useCallback((sessionId: string) => {
        const session = sessions.find((s) => s.id === sessionId);
        if (session) {
            loadMessages(session.messages);
            setShowHistory(false);
        }
    }, [sessions, loadMessages]);

    const handleFeedback = useCallback((type: "up" | "down", messageId: string) => {
        setFeedbackMap((prev) => ({ ...prev, [messageId]: type }));
        if (type === "up") {
            const assistantMsg = messages.find((m) => m.id === messageId);
            const msgIndex = messages.findIndex((m) => m.id === messageId);
            const prevUser = messages.slice(0, msgIndex).reverse().find((m) => m.role === "user");
            if (assistantMsg && prevUser) saveFeedback(prevUser.content, assistantMsg.content);
        }
    }, [messages, saveFeedback]);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    useEffect(() => {
        if (isOpen && inputRef.current) inputRef.current.focus();
    }, [isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim()) {
            sendMessage(input);
            setInput("");
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e); }
    };

    const discussionTurns = useMemo(() => groupIntoTurns(messages), [messages]);

    return (
        <>
            {/* Floating Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 z-[60] w-14 h-14 rounded-full text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center bg-gradient-to-br from-purple-600 to-indigo-500 hover:from-purple-700 hover:to-indigo-600"
                    aria-label="노마 열기"
                >
                    <Sparkles className="h-6 w-6" />
                </button>
            )}

            {/* Chat Panel */}
            {isOpen && (
                <div
                    className="fixed z-[60] h-[640px] max-h-[calc(100vh-48px)] bg-white rounded-2xl shadow-2xl border flex flex-col overflow-hidden transition-all duration-300 w-[520px] border-purple-200"
                    style={{ left: pos.x, top: pos.y }}
                >
                    {/* ── Header ─────────────────────────────────────────── */}
                    <ChatHeader tabLabel={TAB_LABELS[activeTab]} onMouseDown={onMouseDown}>
                        <Button variant="ghost" size="sm" onClick={handleToggleUnifiedSession}
                            title="시스템 인사이트 및 기록"
                            className={`h-8 w-8 p-0 ${showUnifiedSession ? "text-teal-600 bg-teal-100" : "text-gray-400 hover:text-teal-500"}`}>
                            <Link2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { setShowHistory(!showHistory); setShowUnifiedSession(false); }}
                            title="대화 이력"
                            className={`h-8 w-8 p-0 ${showHistory ? "text-purple-600 bg-purple-100" : "text-gray-400 hover:text-purple-500"}`}>
                            <History className="h-4 w-4" />
                        </Button>
                        {messages.length > 0 && !showHistory && !showUnifiedSession && (
                            <Button variant="ghost" size="sm" onClick={clearMessages}
                                className="text-gray-400 hover:text-red-500 h-8 w-8 p-0">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={handlePopout}
                            title="별도 창으로 열기"
                            className="text-gray-400 hover:text-purple-500 h-8 w-8 p-0">
                            <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleClose}
                            className="text-gray-400 hover:text-gray-600 h-8 w-8 p-0">
                            <X className="h-4 w-4" />
                        </Button>
                    </ChatHeader>

                    {/* ── 공유 대화 이력 (단일 컨텍스트) 패널 ──────────────────── */}
                    {showUnifiedSession ? (
                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                            <div className="flex items-center gap-2 mb-3">
                                <button onClick={() => setShowUnifiedSession(false)} className="text-gray-400 hover:text-gray-600">
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <Link2 className="h-3.5 w-3.5 text-teal-500" />
                                <p className="text-sm font-semibold text-gray-700">시스템 기록 보드</p>
                                <span className="text-xs text-gray-400">{unifiedEntries.length}개 항목</span>
                                {unifiedEntries.length > 0 && (
                                    <button onClick={handleClearUnifiedSession}
                                        className="ml-auto text-gray-300 hover:text-red-400"
                                        title="기록 초기화">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                            {/* 프롬프트 패치 섹션 */}
                            {promptPatchList.length > 0 && (
                                <div className="mb-4">
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                                            🔧 노마 행동 지침 패치
                                        </span>
                                        <span className="text-[10px] text-gray-400">{promptPatchList.length}개 적용 중</span>
                                    </div>
                                    <div className="space-y-1.5">
                                        {promptPatchList.map((patch) => (
                                            <div key={patch.id} className="p-2.5 rounded-xl border border-indigo-100 bg-indigo-50/60 group">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-semibold text-indigo-700 truncate">{patch.title}</p>
                                                        <p className="text-[10px] text-gray-500 mt-0.5">
                                                            추가됨 ·{" "}
                                                            {new Date(patch.timestamp).toLocaleString("ko-KR", { month: "short", day: "numeric" })}
                                                        </p>
                                                        <p className="text-[10px] text-gray-600 mt-1 line-clamp-2">{patch.content}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDeletePatch(patch.id)}
                                                        className="opacity-0 group-hover:opacity-100 flex-shrink-0 text-gray-300 hover:text-red-400 transition-opacity mt-0.5"
                                                        title="패치 삭제">
                                                        <Trash className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="border-t border-gray-100 mt-3 mb-2" />
                                </div>
                            )}

                            {/* Code 요청 섹션 */}
                            {codeTaskList.length > 0 && (
                                <div className="mb-4">
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                                            🛠 시스템 코드/작업 요청함
                                        </span>
                                        <span className="text-[10px] text-gray-400">{codeTaskList.length}개</span>
                                    </div>
                                    <div className="space-y-1.5">
                                        {codeTaskList.map((task) => (
                                            <div key={task.id} className={`p-2.5 rounded-xl border group ${task.status === "resolved" ? "bg-green-50/60 border-green-100" : "bg-orange-50/60 border-orange-100"}`}>
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5 mb-0.5">
                                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${task.status === "resolved" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                                                                {task.status === "resolved" ? "완료" : "대기중"}
                                                            </span>
                                                            <span className="text-[9px] text-gray-400">
                                                                {task.type === "bug_fix" ? "버그수정" : task.type === "feature_request" ? "기능추가" : task.type === "analysis" ? "분석" : "질문"}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs font-semibold text-gray-800 truncate">{task.title}</p>
                                                        <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{task.description}</p>
                                                        {task.resolution && (
                                                            <p className="text-[10px] text-green-600 mt-1 line-clamp-2">✓ {task.resolution}</p>
                                                        )}
                                                        <p className="text-[9px] text-gray-300 mt-0.5">
                                                            {new Date(task.timestamp).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDeleteCodeTask(task.id)}
                                                        className="opacity-0 group-hover:opacity-100 flex-shrink-0 text-gray-300 hover:text-red-400 transition-opacity mt-0.5"
                                                        title="작업 삭제">
                                                        <Trash className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="border-t border-gray-100 mt-3 mb-2" />
                                </div>
                            )}

                            {unifiedEntries.length === 0 ? (
                                <p className="text-xs text-center text-gray-400 py-8">
                                    아직 기록된 항목이 없습니다.<br />
                                    대화 중 중요한 사실은 이곳에 기록됩니다.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {unifiedEntries.map((entry, i) => {
                                        const styleMap: Record<string, { bg: string; label: string; color: string; icon: React.ReactNode }> = {
                                            user: { bg: "bg-blue-50 border-blue-100", label: "사용자", color: "text-blue-600", icon: <Bot className="h-3 w-3" /> },
                                            noma: { bg: "bg-purple-50 border-purple-100", label: "노마", color: "text-purple-600", icon: <Bot className="h-3 w-3" /> },
                                            sena: { bg: "bg-purple-50 border-purple-100", label: "노마", color: "text-purple-600", icon: <Bot className="h-3 w-3" /> },
                                            insight: { bg: "bg-teal-50 border-teal-200", label: "💡 인사이트", color: "text-teal-700", icon: <Link2 className="h-3 w-3" /> },
                                            decision: { bg: "bg-green-50 border-green-200", label: "✅ 결정", color: "text-green-700", icon: <Link2 className="h-3 w-3" /> },
                                            action: { bg: "bg-amber-50 border-amber-200", label: "⚡ 액션", color: "text-amber-700", icon: <Link2 className="h-3 w-3" /> },
                                        };
                                        const s = styleMap[entry.role] ?? styleMap.noma;
                                        return (
                                            <div key={i} className={`p-2.5 rounded-xl border text-xs ${s.bg}`}>
                                                <div className={`flex items-center gap-1 font-semibold mb-1 ${s.color}`}>
                                                    {s.icon}
                                                    {s.label}
                                                    <span className="ml-auto font-normal text-gray-400">
                                                        {new Date(entry.timestamp).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                                    </span>
                                                </div>
                                                <p className="text-gray-700 line-clamp-3 leading-relaxed">{entry.content}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ) : showHistory ? (
                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                            <div className="flex items-center gap-2 mb-3">
                                <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600">
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <p className="text-sm font-semibold text-gray-700">대화 이력</p>
                                <span className="text-xs text-gray-400">최근 {sessions.length}개 세션</span>
                            </div>
                            {sessions.length === 0 ? (
                                <p className="text-xs text-center text-gray-400 py-8">저장된 대화가 없습니다.</p>
                            ) : (
                                sessions.map((s) => (
                                    <div key={s.id}
                                        className="flex items-start gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-purple-200 cursor-pointer group"
                                        onClick={() => handleRestoreSession(s.id)}>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                <p className="text-xs font-medium text-gray-700 truncate">{s.summary}</p>
                                            </div>
                                            <p className="text-[10px] text-gray-400">
                                                {new Date(s.startedAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                                {" · "}{s.messages.length}개 메시지
                                            </p>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                                            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-opacity flex-shrink-0">
                                            <Trash className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <>
                            {/* ── 메시지 영역 ─────────────────────────────────── */}
                            <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
                                {messages.length === 0 ? (
                                    <SuggestedQuestions
                                        onSelect={(q) => sendMessage(q)}
                                        activeTab={activeTab}
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
                                <div className="mx-3 mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
                                    {error}
                                </div>
                            )}

                            {/* ── 입력 영역 ────────────────────────────────────── */}
                            <form onSubmit={handleSubmit} className="p-3 border-t border-purple-100 bg-gradient-to-r from-purple-50/50 to-indigo-50/50">
                                <div className="flex items-end gap-2 bg-white border rounded-xl p-2 border-purple-200 focus-within:border-purple-400 focus-within:ring-1 focus-within:ring-purple-200">
                                    <textarea
                                        ref={inputRef}
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="노마에게 대시보드 구조나 인사이트를 물어보세요..."
                                        rows={1}
                                        className="flex-1 resize-none border-0 bg-transparent px-2 py-1.5 text-sm focus:outline-none placeholder:text-gray-400"
                                        style={{ maxHeight: "80px" }}
                                        onInput={(e) => {
                                            const t = e.target as HTMLTextAreaElement;
                                            t.style.height = "auto";
                                            t.style.height = `${Math.min(t.scrollHeight, 80)}px`;
                                        }}
                                    />
                                    <Button type="submit" size="sm"
                                        disabled={!input.trim() || isLoading}
                                        className="rounded-lg disabled:opacity-40 h-8 w-8 p-0 flex-shrink-0 bg-gradient-to-br from-purple-600 to-indigo-500 hover:from-purple-700 hover:to-indigo-600 text-white">
                                        <Send className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1.5 text-center">
                                    노마 — 데이터 분석 & 시스템 제어 AI
                                </p>
                            </form>
                        </>
                    )}
                </div>
            )}
        </>
    );
}
