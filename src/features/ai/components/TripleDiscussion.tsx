import { Bot, BrainCircuit, User } from "lucide-react";
import type { ChatMessage } from "../lib/ai-types";

// ── 턴 그룹핑 ─────────────────────────────────────────────────
export interface ConversationTurn {
    user: ChatMessage;
    noma?: ChatMessage;
    claude?: ChatMessage;
}

export function groupIntoTurns(messages: ChatMessage[]): ConversationTurn[] {
    const turns: ConversationTurn[] = [];
    let current: ConversationTurn | null = null;

    for (const msg of messages) {
        if (msg.role === "user") {
            if (current) turns.push(current);
            current = { user: msg };
        } else if (msg.source === "noma" && current) {
            current.noma = msg;
        } else if (msg.source === "claude" && current) {
            current.claude = msg;
        }
    }
    if (current) turns.push(current);
    return turns;
}

// ── 마크다운 렌더러 ────────────────────────────────────────────
export function renderMarkdown(text: string): string {
    let html = text
        .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-gray-100 rounded-lg p-3 overflow-x-auto my-2 text-sm"><code>$2</code></pre>')
        .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-sm">$1</code>')
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/^### (.+)$/gm, '<h3 class="font-semibold text-base mt-3 mb-1">$1</h3>')
        .replace(/^## (.+)$/gm, '<h2 class="font-semibold text-lg mt-4 mb-1">$1</h2>')
        .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-gray-300 pl-3 my-2 text-gray-600 italic">$1</blockquote>')
        .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
        .replace(/^\|(.+)\|$/gm, (match) => {
            const cells = match.split("|").filter(Boolean);
            if (cells.every((c) => /^[\s-:]+$/.test(c))) return "";
            return `<tr>${cells.map((c) => `<td class="border border-gray-200 px-2 py-1 text-sm">${c.trim()}</td>`).join("")}</tr>`;
        })
        .replace(/\n\n/g, "<br/><br/>")
        .replace(/\n/g, "<br/>");

    if (html.includes("<tr>")) {
        html = html.replace(/(<tr>[\s\S]*?<\/tr>(?:<br\/>)*)+/g, '<table class="border-collapse my-2 w-full">$&</table>');
    }
    html = html.replace(/(<li[\s\S]*?<\/li>(?:<br\/>)*)+/g, '<ul class="my-2">$&</ul>');
    html = html.replace(/<\/li><br\/>/g, "</li>");
    html = html.replace(/<\/tr><br\/>/g, "</tr>");
    html = html.replace(/<\/table><br\/>/g, "</table>");
    html = html.replace(/<\/pre><br\/>/g, "</pre>");
    return html;
}

// ── 토론 카드 ─────────────────────────────────────────────────
interface DiscussionCardProps {
    turn: ConversationTurn;
    onFeedback: (type: "up" | "down", id: string) => void;
    feedbackMap: Record<string, "up" | "down">;
}

function LoadingDots({ color }: { color: string }) {
    return (
        <div className="flex items-center gap-1 py-1">
            <div className={`w-2 h-2 ${color} rounded-full animate-bounce`} />
            <div className={`w-2 h-2 ${color} rounded-full animate-bounce [animation-delay:0.15s]`} />
            <div className={`w-2 h-2 ${color} rounded-full animate-bounce [animation-delay:0.3s]`} />
        </div>
    );
}

export function DiscussionCard({ turn, onFeedback, feedbackMap }: DiscussionCardProps) {
    return (
        <div className="space-y-2">
            {/* 사용자 메시지 */}
            <div className="flex justify-end">
                <div className="flex items-end gap-2">
                    <div className="bg-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[85%]">
                        <p className="text-sm whitespace-pre-wrap">{turn.user.content}</p>
                    </div>
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <User className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                </div>
            </div>

            {/* 토론 카드 */}
            {(turn.noma || turn.claude) && (
                <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white shadow-sm">
                    {/* 노마 응답 */}
                    <div className="border-l-4 border-purple-400 bg-purple-50/30">
                        <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                            <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
                                <Bot className="h-3.5 w-3.5 text-purple-600" />
                            </div>
                            <span className="text-xs font-bold text-purple-600">노마</span>
                            <span className="text-[10px] text-purple-400">NOde Management Assistant</span>
                        </div>
                        <div className="px-4 pb-3">
                            {turn.noma?.content ? (
                                <div
                                    className="text-sm text-gray-800 prose-sm"
                                    dangerouslySetInnerHTML={{ __html: renderMarkdown(turn.noma.content) }}
                                />
                            ) : (
                                <LoadingDots color="bg-purple-400" />
                            )}
                        </div>
                        {turn.noma?.content && (
                            <div className="flex gap-1 px-4 pb-2">
                                <button
                                    onClick={() => turn.noma && onFeedback("up", turn.noma.id)}
                                    className={`p-1 rounded text-xs transition-all ${feedbackMap[turn.noma?.id ?? ""] === "up" ? "bg-green-100 ring-1 ring-green-300 scale-110" : "opacity-40 hover:opacity-100"}`}
                                    title="좋은 답변">👍</button>
                                <button
                                    onClick={() => turn.noma && onFeedback("down", turn.noma.id)}
                                    className={`p-1 rounded text-xs transition-all ${feedbackMap[turn.noma?.id ?? ""] === "down" ? "bg-red-100 ring-1 ring-red-300 scale-110" : "opacity-40 hover:opacity-100"}`}
                                    title="아쉬운 답변">👎</button>
                            </div>
                        )}
                    </div>

                    {/* 구분선 */}
                    {turn.noma && (
                        <div className="flex items-center gap-2 px-4 py-1.5 bg-gray-50 border-t border-b border-gray-100">
                            <BrainCircuit className="h-3 w-3 text-orange-400" />
                            <span className="text-[10px] text-gray-400">
                                {turn.claude?.content ? "세나의 관점" : "세나가 검토 중..."}
                            </span>
                        </div>
                    )}

                    {/* 세나 응답 */}
                    {turn.noma && (
                        <div className="border-l-4 border-orange-400 bg-orange-50/20">
                            <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                                <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center">
                                    <BrainCircuit className="h-3.5 w-3.5 text-orange-600" />
                                </div>
                                <span className="text-xs font-bold text-orange-600">세나</span>
                                <span className="text-[10px] text-orange-400">선배 컨설턴트</span>
                            </div>
                            <div className="px-4 pb-3">
                                {turn.claude?.content ? (
                                    <div
                                        className="text-sm text-gray-800 prose-sm"
                                        dangerouslySetInnerHTML={{ __html: renderMarkdown(turn.claude.content) }}
                                    />
                                ) : (
                                    <LoadingDots color="bg-orange-400" />
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── 3자 대화 헤더 ─────────────────────────────────────────────
interface TripleHeaderProps {
    tabLabel: string;
    children?: React.ReactNode; // 우측 버튼들
    onMouseDown?: (e: React.MouseEvent) => void;
}

export function TripleHeader({ tabLabel, children, onMouseDown }: TripleHeaderProps) {
    return (
        <div
            className="flex items-center justify-between px-4 py-3 border-b border-purple-100 cursor-move select-none"
            style={{ background: "linear-gradient(135deg, #faf5ff 0%, #fff7ed 100%)" }}
            onMouseDown={onMouseDown}
        >
            <div className="flex items-center gap-3">
                <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-purple-100 border-2 border-white flex items-center justify-center shadow-sm z-10">
                        <Bot className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-orange-100 border-2 border-white flex items-center justify-center shadow-sm -ml-2 z-20">
                        <BrainCircuit className="h-4 w-4 text-orange-600" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center shadow-sm -ml-2 z-30">
                        <User className="h-4 w-4 text-blue-600" />
                    </div>
                </div>
                <div>
                    <h2 className="text-sm font-bold text-gray-800 leading-tight">3자 논의 세션</h2>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-semibold text-purple-500">노마</span>
                        <span className="text-[10px] text-gray-300">·</span>
                        <span className="text-[10px] font-semibold text-orange-500">세나</span>
                        <span className="text-[10px] text-gray-300">·</span>
                        <span className="text-[10px] font-semibold text-blue-500">나</span>
                        <span className="text-[10px] text-gray-300 mx-0.5">|</span>
                        <span className="text-[10px] text-gray-400">{tabLabel}</span>
                    </div>
                </div>
            </div>
            {children && <div className="flex items-center gap-1">{children}</div>}
        </div>
    );
}
