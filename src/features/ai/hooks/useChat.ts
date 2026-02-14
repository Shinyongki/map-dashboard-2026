import { useState, useCallback, useRef } from "react";
import type { ChatMessage } from "../lib/ai-types";
import { streamChatResponse } from "../lib/ai-api";

export function useChat(systemPrompt: string) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
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
                // Remove empty assistant message on error
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

    const clearMessages = useCallback(() => {
        setMessages([]);
        setError(null);
    }, []);

    return { messages, isLoading, error, sendMessage, clearMessages };
}
