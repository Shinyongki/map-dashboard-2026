import { useState, useRef, useEffect } from "react";
import {
    ArrowLeft,
    BotMessageSquare,
    CheckCircle,
    FileText,
    Send,
    MessageSquare,
    ChevronDown,
    ChevronUp,
    ClipboardCopy,
} from "lucide-react";
import type { Question, OfficialDocument } from "@/features/qna/lib/types";
import { api } from "@/features/qna/api/client";

interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}

interface AdminAnswerEditorProps {
    question: Question;
    relatedDocument?: OfficialDocument | null;
    adminName: string;
    onApprove: (
        questionId: string,
        finalAnswer: string,
        answeredBy: string
    ) => Promise<void>;
    onBack: () => void;
}

const QUICK_PROMPTS = [
    "더 간결하게 요약해줘",
    "항목별로 번호 목록으로 정리해줘",
    "더 공식적인 문체로 바꿔줘",
    "핵심 근거 조항을 명확하게 표시해줘",
];

export default function AdminAnswerEditor({
    question,
    relatedDocument,
    adminName,
    onApprove,
    onBack,
}: AdminAnswerEditorProps) {
    const [answer, setAnswer] = useState(question.aiDraftAnswer || "");
    const [submitting, setSubmitting] = useState(false);

    // Chat state
    const [chatOpen, setChatOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [chatLoading, setChatLoading] = useState(false);
    const chatBottomRef = useRef<HTMLDivElement>(null);
    const chatInputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (chatOpen && chatBottomRef.current) {
            chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [chatMessages, chatOpen]);

    const handleApprove = async () => {
        if (!answer.trim()) return;
        setSubmitting(true);
        try {
            await onApprove(question.id, answer.trim(), adminName);
            onBack();
        } catch (err) {
            console.error("승인 실패:", err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleUseAiDraft = () => {
        if (question.aiDraftAnswer) {
            setAnswer(question.aiDraftAnswer);
        }
    };

    const sendChat = async (messageText: string) => {
        const text = messageText.trim();
        if (!text || chatLoading) return;

        const newUserMsg: ChatMessage = { role: "user", content: text };
        const updatedHistory = [...chatMessages, newUserMsg];
        setChatMessages(updatedHistory);
        setChatInput("");
        setChatLoading(true);

        try {
            const result = await api.post<{ reply: string }>(
                `/questions/${question.id}/chat`,
                {
                    message: text,
                    conversationHistory: chatMessages,
                    currentDraft: answer,
                }
            );
            setChatMessages([...updatedHistory, { role: "assistant", content: result.reply }]);
        } catch (err: any) {
            setChatMessages([
                ...updatedHistory,
                { role: "assistant", content: `오류: ${err.message || "AI 응답 생성에 실패했습니다."}` },
            ]);
        } finally {
            setChatLoading(false);
            setTimeout(() => chatInputRef.current?.focus(), 100);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendChat(chatInput);
        }
    };

    const applyToAnswer = (content: string) => {
        setAnswer(content);
        // Scroll to answer editor
        document.getElementById("answer-editor")?.scrollIntoView({ behavior: "smooth" });
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2">
                <button
                    onClick={onBack}
                    className="text-gray-400 hover:text-gray-600"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <h3 className="text-lg font-bold text-gray-900">답변 검토/승인</h3>
            </div>

            {/* Question info */}
            <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                    <span className="px-1.5 py-0.5 rounded border border-gray-200 text-xs text-gray-600">
                        {question.category}
                    </span>
                    <span className="text-sm text-gray-500">
                        {question.authorOrgName} · {question.authorName}
                    </span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">{question.title}</h4>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {question.content}
                </p>
            </div>

            {/* Related document */}
            {relatedDocument && (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg text-sm">
                    <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-600">
                        [{relatedDocument.documentNumber}] {relatedDocument.title}
                    </span>
                </div>
            )}

            {/* AI Draft reference */}
            {question.aiDraftAnswer && (
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <BotMessageSquare className="h-4 w-4 text-blue-500" />
                            <h4 className="text-sm font-semibold text-blue-700">AI 초안</h4>
                        </div>
                        <button
                            onClick={handleUseAiDraft}
                            className="px-3 py-1 border border-gray-300 rounded-lg text-xs text-gray-700 hover:bg-gray-50"
                        >
                            AI 초안 사용
                        </button>
                    </div>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {question.aiDraftAnswer}
                    </div>
                </div>
            )}

            {/* Claude 대화 섹션 */}
            <div className="border border-purple-200 rounded-xl overflow-hidden">
                {/* Chat header / toggle */}
                <button
                    onClick={() => setChatOpen(!chatOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-purple-50 hover:bg-purple-100 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-semibold text-purple-800">
                            Claude와 대화로 답변 조정
                        </span>
                        {chatMessages.length > 0 && (
                            <span className="px-1.5 py-0.5 bg-purple-200 text-purple-700 rounded-full text-xs">
                                {chatMessages.length}
                            </span>
                        )}
                    </div>
                    {chatOpen ? (
                        <ChevronUp className="h-4 w-4 text-purple-500" />
                    ) : (
                        <ChevronDown className="h-4 w-4 text-purple-500" />
                    )}
                </button>

                {chatOpen && (
                    <div className="flex flex-col">
                        {/* Quick prompts */}
                        {chatMessages.length === 0 && (
                            <div className="px-4 pt-3 pb-2 bg-white border-b border-purple-100">
                                <p className="text-xs text-gray-500 mb-2">빠른 요청:</p>
                                <div className="flex flex-wrap gap-2">
                                    {QUICK_PROMPTS.map((prompt) => (
                                        <button
                                            key={prompt}
                                            onClick={() => sendChat(prompt)}
                                            disabled={chatLoading}
                                            className="px-2.5 py-1 bg-purple-50 border border-purple-200 rounded-full text-xs text-purple-700 hover:bg-purple-100 disabled:opacity-50"
                                        >
                                            {prompt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Messages */}
                        <div className="flex flex-col gap-3 px-4 py-3 max-h-80 overflow-y-auto bg-white">
                            {chatMessages.length === 0 && (
                                <p className="text-xs text-center text-gray-400 py-4">
                                    "더 간결하게 해줘", "3번 항목을 자세히 설명해줘" 등
                                    <br />Claude에게 답변 수정을 요청해보세요.
                                </p>
                            )}

                            {chatMessages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                                >
                                    <div
                                        className={`max-w-[85%] px-3 py-2 rounded-xl text-sm whitespace-pre-wrap ${
                                            msg.role === "user"
                                                ? "bg-purple-600 text-white rounded-br-none"
                                                : "bg-gray-100 text-gray-800 rounded-bl-none"
                                        }`}
                                    >
                                        {msg.content}
                                    </div>

                                    {/* Apply button for assistant messages */}
                                    {msg.role === "assistant" && (
                                        <button
                                            onClick={() => applyToAnswer(msg.content)}
                                            className="mt-1 flex items-center gap-1 px-2 py-0.5 text-xs text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded"
                                        >
                                            <ClipboardCopy className="h-3 w-3" />
                                            답변에 적용
                                        </button>
                                    )}
                                </div>
                            ))}

                            {chatLoading && (
                                <div className="flex items-start">
                                    <div className="bg-gray-100 rounded-xl rounded-bl-none px-4 py-2.5">
                                        <div className="flex gap-1 items-center">
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div ref={chatBottomRef} />
                        </div>

                        {/* Input area */}
                        <div className="flex gap-2 px-4 py-3 border-t border-purple-100 bg-purple-50">
                            <textarea
                                ref={chatInputRef}
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                disabled={chatLoading}
                                rows={2}
                                placeholder="수정 요청을 입력하세요… (Enter로 전송, Shift+Enter 줄바꿈)"
                                className="flex-1 px-3 py-2 border border-purple-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 disabled:opacity-50 bg-white"
                            />
                            <button
                                onClick={() => sendChat(chatInput)}
                                disabled={chatLoading || !chatInput.trim()}
                                className="self-end px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 transition-colors"
                            >
                                <Send className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Answer editor */}
            <div id="answer-editor">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    최종 답변 작성
                </h4>
                <textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    rows={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                    placeholder="최종 답변을 작성하세요. AI 초안을 수정하거나 Claude와 대화하여 조정할 수 있습니다."
                />
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end">
                <button
                    onClick={onBack}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                    취소
                </button>
                <button
                    onClick={handleApprove}
                    disabled={submitting || !answer.trim()}
                    className="flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                    {submitting ? (
                        "승인 중..."
                    ) : (
                        <>
                            <CheckCircle className="h-4 w-4" />
                            답변 승인 및 전달
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
