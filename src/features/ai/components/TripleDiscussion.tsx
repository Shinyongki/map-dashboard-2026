import { Bot, User } from "lucide-react";
import type { ChatMessage } from "../lib/ai-types";

// ── 턴 그룹핑 ─────────────────────────────────────────────────
export interface ConversationTurn {
    user: ChatMessage;
    noma?: ChatMessage;
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
        <div className="flex items-center gap-1 py-1 px-1">
            <div className={`w-2 h-2 ${color} rounded-full animate-bounce`} />
            <div className={`w-2 h-2 ${color} rounded-full animate-bounce [animation-delay:0.15s]`} />
            <div className={`w-2 h-2 ${color} rounded-full animate-bounce [animation-delay:0.3s]`} />
        </div>
    );
}

export function DiscussionCard({ turn, onFeedback, feedbackMap }: DiscussionCardProps) {
    return (
        <div className="space-y-4">
            {/* 사용자 메시지 */}
            <div className="flex justify-end mb-2">
                <div className="flex items-end gap-2">
                    <div className="bg-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[85%] shadow-sm">
                        <p className="text-sm whitespace-pre-wrap">{turn.user.content}</p>
                    </div>
                </div>
            </div>

            {/* 노마 응답 카드 */}
            <div className="flex justify-start">
                <div className="flex items-start gap-3 w-full">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-1">
                        <Bot className="h-4 w-4 text-purple-600" />
                    </div>

                    <div className="flex-1 rounded-2xl rounded-tl-sm border border-gray-200 overflow-hidden bg-white shadow-sm max-w-[90%]">
                        <div className="px-4 pt-3 pb-1 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-800">노마</span>
                                <span className="text-[10px] text-gray-500">AI 컨트롤러</span>
                            </div>
                        </div>

                        <div className="px-4 py-3">
                            {turn.noma?.content ? (
                                <div
                                    className="text-sm text-gray-800 prose-sm focus:outline-none"
                                    dangerouslySetInnerHTML={{ __html: renderMarkdown(turn.noma.content) }}
                                />
                            ) : (
                                <LoadingDots color="bg-purple-400" />
                            )}
                        </div>

                        {turn.noma?.content && (
                            <div className="flex gap-2 px-4 pb-3 justify-end items-center border-t border-gray-50 pt-2 bg-gray-50/30">
                                <button
                                    onClick={() => turn.noma && onFeedback("up", turn.noma.id)}
                                    className={`p-1.5 rounded-md text-xs transition-all flex items-center gap-1 ${feedbackMap[turn.noma?.id ?? ""] === "up" ? "bg-green-100 text-green-700 font-medium" : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"}`}
                                    title="좋은 답변">
                                    👍 <span className="text-[10px]">유용함</span>
                                </button>
                                <button
                                    onClick={() => turn.noma && onFeedback("down", turn.noma.id)}
                                    className={`p-1.5 rounded-md text-xs transition-all flex items-center gap-1 ${feedbackMap[turn.noma?.id ?? ""] === "down" ? "bg-red-100 text-red-700 font-medium" : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"}`}
                                    title="아쉬운 답변">
                                    👎
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── 1:1 대화 헤더 ─────────────────────────────────────────────
interface ChatHeaderProps {
    tabLabel: string;
    children?: React.ReactNode; // 우측 버튼들
    onMouseDown?: (e: React.MouseEvent) => void;
}

export function ChatHeader({ tabLabel, children, onMouseDown }: ChatHeaderProps) {
    return (
        <div
            className="flex items-center justify-between px-4 py-3 border-b border-purple-100 cursor-move select-none"
            style={{ background: "linear-gradient(135deg, #f3e8ff 0%, #ede9fe 100%)" }}
            onMouseDown={onMouseDown}
        >
            <div className="flex items-center gap-3">
                <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-purple-100 border-2 border-white flex items-center justify-center shadow-sm z-10">
                        <Bot className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center shadow-sm -ml-2 z-20">
                        <User className="h-4 w-4 text-blue-600" />
                    </div>
                </div>
                <div>
                    <h2 className="text-sm font-bold text-gray-800 leading-tight">노마 AI 세션</h2>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-semibold text-purple-500">노마</span>
                        <span className="text-[10px] text-gray-300">·</span>
                        <span className="text-[10px] font-semibold text-blue-500">나</span>
                        <span className="text-[10px] text-gray-300 mx-0.5">|</span>
                        <span className="text-[10px] text-gray-500">{tabLabel}</span>
                    </div>
                </div>
            </div>
            {children && <div className="flex items-center gap-1">{children}</div>}
        </div>
    );
}
