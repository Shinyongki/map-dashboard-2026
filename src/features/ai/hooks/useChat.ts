import { useState, useCallback, useRef } from "react";
import type { ChatMessage } from "../lib/ai-types";
import { streamChatResponse, streamTripleChatResponse } from "../lib/ai-api";

export function useChat(systemPrompt: string, initialMessages?: ChatMessage[]) {
    const [messages, setMessages] = useState<ChatMessage[]>(initialMessages ?? []);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    const sendMessage = useCallback(
        async (content: string) => {
            if (!content.trim() || isLoading) return;

            setError(null);

            const userMessage: ChatMessage = {
                id: crypto.randomUUID(),
                role: "user",
                content: content.trim(),
                timestamp: new Date(),
            };

            const assistantMessage: ChatMessage = {
                id: crypto.randomUUID(),
                role: "assistant",
                content: "",
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, userMessage, assistantMessage]);
            setIsLoading(true);

            try {
                const apiMessages = [...messages, userMessage].map((m) => ({
                    role: m.role,
                    content: m.content,
                }));

                const stream = streamChatResponse(apiMessages, systemPrompt);

                for await (const chunk of stream) {
                    setMessages((prev) => {
                        const updated = [...prev];
                        const last = updated[updated.length - 1];
                        if (last.role === "assistant") {
                            updated[updated.length - 1] = {
                                ...last,
                                content: last.content + chunk,
                            };
                        }
                        return updated;
                    });
                }
            } catch (err) {
                const msg =
                    err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다";
                setError(msg);
                setMessages((prev) => {
                    const last = prev[prev.length - 1];
                    if (last?.role === "assistant" && !last.content) {
                        return prev.slice(0, -1);
                    }
                    return prev;
                });
            } finally {
                setIsLoading(false);
            }
        },
        [messages, systemPrompt, isLoading]
    );

    // ── 3자 대화 모드 ────────────────────────────────────────────
    const sendTripleMessage = useCallback(
        async (content: string) => {
            if (!content.trim() || isLoading) return;

            setError(null);

            const userMessage: ChatMessage = {
                id: crypto.randomUUID(),
                role: "user",
                content: content.trim(),
                timestamp: new Date(),
            };

            // 노마와 Claude 응답 placeholder 동시 생성
            const nomaId = crypto.randomUUID();
            const claudeId = crypto.randomUUID();
            const nomaMessage: ChatMessage = {
                id: nomaId,
                role: "assistant",
                content: "",
                source: "noma",
                timestamp: new Date(),
            };
            const claudeMessage: ChatMessage = {
                id: claudeId,
                role: "assistant",
                content: "",
                source: "claude",
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, userMessage, nomaMessage, claudeMessage]);
            setIsLoading(true);

            try {
                const apiMessages = [...messages, userMessage].map((m) => ({
                    role: (m.source === "noma" ? "noma" : m.source === "claude" ? "claude" : m.role) as any,
                    content: m.content,
                }));

                const stream = streamTripleChatResponse(apiMessages, systemPrompt);

                for await (const chunk of stream) {
                    if ("error" in chunk) {
                        setError(chunk.error);
                        break;
                    }
                    if ("done" in chunk && chunk.done) continue;
                    if (!chunk.text) continue; // undefined/empty 텍스트 청크 무시

                    const targetId = chunk.source === "noma" ? nomaId : claudeId;
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === targetId
                                ? { ...m, content: m.content + chunk.text }
                                : m
                        )
                    );
                }
            } catch (err) {
                const msg = err instanceof Error ? err.message : "알 수 없는 오류";
                setError(msg);
            } finally {
                setIsLoading(false);
            }
        },
        [messages, systemPrompt, isLoading]
    );

    const clearMessages = useCallback(() => {
        setMessages([]);
        setError(null);
    }, []);

    const loadMessages = useCallback((msgs: ChatMessage[]) => {
        setMessages(msgs);
        setError(null);
    }, []);

    return { messages, isLoading, error, sendMessage, sendTripleMessage, clearMessages, loadMessages };
}
