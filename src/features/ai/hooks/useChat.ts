import { useState, useCallback, useRef } from "react";
import type { ChatMessage } from "../lib/ai-types";
import { streamTripleChatResponse } from "../lib/ai-api";

/**
 * systemPrompt: 고정 문자열 OR 메시지별 동적 생성 함수.
 * 함수 형태로 전달하면 sendMessage 호출 시점에 해당 메시지로 평가되어
 * 키워드 기반 확장 컨텍스트 전환이 가능합니다.
 */
export function useChat(
    systemPrompt: string | ((message: string) => string),
    initialMessages?: ChatMessage[]
) {
    const [messages, setMessages] = useState<ChatMessage[]>(initialMessages ?? []);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    // 최신 systemPrompt를 ref로 유지 (stale closure 방지)
    const systemPromptRef = useRef(systemPrompt);
    systemPromptRef.current = systemPrompt;

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
                source: "noma",
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, userMessage, assistantMessage]);
            setIsLoading(true);

            // 메시지 전송 시점에 systemPrompt 평가 (동적 모드 지원)
            const resolvedPrompt =
                typeof systemPromptRef.current === "function"
                    ? systemPromptRef.current(content)
                    : systemPromptRef.current;

            try {
                const apiMessages = [...messages, userMessage].map((m) => ({
                    role: m.role as any,
                    content: m.content,
                }));

                // unified endpoint (/triple-chat is now the unified tool-enabled endpoint)
                const stream = streamTripleChatResponse(apiMessages, resolvedPrompt);

                for await (const chunk of stream) {
                    if ("error" in chunk) {
                        setError(chunk.error);
                        break;
                    }
                    if ("done" in chunk && chunk.done) continue;
                    if (!chunk.text) continue; // undefined/empty 텍스트 청크 무시

                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === assistantMessage.id
                                ? { ...m, content: m.content + chunk.text }
                                : m
                        )
                    );
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
        [messages, isLoading]
    );

    const clearMessages = useCallback(() => {
        setMessages([]);
        setError(null);
    }, []);

    const loadMessages = useCallback((msgs: ChatMessage[]) => {
        setMessages(msgs);
        setError(null);
    }, []);

    // sendTripleMessage is aliased to sendMessage for backward compatibility while refactoring
    return { messages, isLoading, error, sendMessage, sendTripleMessage: sendMessage, clearMessages, loadMessages };
}
