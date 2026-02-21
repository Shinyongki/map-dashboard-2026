import { ThumbsUp, ThumbsDown, User, Bot, BrainCircuit } from "lucide-react";
import type { ChatMessage as ChatMessageType } from "../lib/ai-types";

interface ChatMessageProps {
    message: ChatMessageType;
    prevUserContent?: string;
    onFeedback?: (type: "up" | "down", messageId: string) => void;
    feedbackGiven?: "up" | "down" | null;
}

function renderMarkdown(text: string): string {
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
            const cellHtml = cells
                .map((c) => `<td class="border border-gray-200 px-2 py-1 text-sm">${c.trim()}</td>`)
                .join("");
            return `<tr>${cellHtml}</tr>`;
        })
        .replace(/\n\n/g, "<br/><br/>")
        .replace(/\n/g, "<br/>");

    if (html.includes("<tr>")) {
        html = html.replace(
            /(<tr>[\s\S]*?<\/tr>(?:<br\/>)*)+/g,
            '<table class="border-collapse my-2 w-full">$&</table>'
        );
    }
    html = html.replace(/(<li[\s\S]*?<\/li>(?:<br\/>)*)+/g, '<ul class="my-2">$&</ul>');
    html = html.replace(/<\/li><br\/>/g, "</li>");
    html = html.replace(/<\/tr><br\/>/g, "</tr>");
    html = html.replace(/<\/table><br\/>/g, "</table>");
    html = html.replace(/<\/pre><br\/>/g, "</pre>");

    return html;
}

// 발신자별 스타일 정의
const SOURCE_STYLES = {
    noma: {
        avatar: "bg-purple-100 text-purple-600",
        bubble: "bg-white border border-purple-100 text-gray-800",
        dot: "bg-purple-400",
        label: "노마",
        labelColor: "text-purple-500",
        icon: <Bot className="h-4 w-4" />,
    },
    claude: {
        avatar: "bg-orange-100 text-orange-600",
        bubble: "bg-orange-50 border border-orange-100 text-gray-800",
        dot: "bg-orange-400",
        label: "세나",
        labelColor: "text-orange-500",
        icon: <BrainCircuit className="h-4 w-4" />,
    },
} as const;

export default function ChatMessage({
    message,
    prevUserContent,
    onFeedback,
    feedbackGiven,
}: ChatMessageProps) {
    const isUser = message.role === "user";
    const source = message.source; // "noma" | "claude" | undefined

    const style = source ? SOURCE_STYLES[source] : SOURCE_STYLES.noma;
    const dotColor = source === "claude" ? "bg-orange-400" : "bg-purple-400";

    return (
        <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
            <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    isUser ? "bg-blue-100 text-blue-600" : style.avatar
                }`}
            >
                {isUser ? <User className="h-4 w-4" /> : style.icon}
            </div>

            <div className={`flex flex-col gap-1 max-w-[80%] ${isUser ? "items-end" : "items-start"}`}>
                {/* 발신자 레이블 (3자 대화 시) */}
                {!isUser && source && (
                    <span className={`text-[10px] font-semibold px-1 ${style.labelColor}`}>
                        {style.label}
                    </span>
                )}

                <div
                    className={`rounded-2xl px-4 py-3 ${
                        isUser
                            ? "bg-blue-600 text-white"
                            : style.bubble
                    }`}
                >
                    {isUser ? (
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    ) : message.content ? (
                        <div
                            className="text-sm prose-sm"
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
                        />
                    ) : (
                        <div className="flex items-center gap-1.5 py-1">
                            <div className={`w-2 h-2 ${dotColor} rounded-full animate-bounce`} />
                            <div className={`w-2 h-2 ${dotColor} rounded-full animate-bounce [animation-delay:0.15s]`} />
                            <div className={`w-2 h-2 ${dotColor} rounded-full animate-bounce [animation-delay:0.3s]`} />
                        </div>
                    )}
                </div>

                {/* 피드백 버튼 */}
                {!isUser && message.content && onFeedback && source !== "claude" && (
                    <div className="flex gap-1 px-1">
                        <button
                            onClick={() => onFeedback("up", message.id)}
                            title="좋은 답변 (노마가 기억합니다)"
                            className={`p-1 rounded transition-colors ${
                                feedbackGiven === "up"
                                    ? "text-green-600 bg-green-50"
                                    : "text-gray-300 hover:text-green-500"
                            }`}
                        >
                            <ThumbsUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                            onClick={() => onFeedback("down", message.id)}
                            title="아쉬운 답변"
                            className={`p-1 rounded transition-colors ${
                                feedbackGiven === "down"
                                    ? "text-red-400 bg-red-50"
                                    : "text-gray-300 hover:text-red-400"
                            }`}
                        >
                            <ThumbsDown className="h-3.5 w-3.5" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
