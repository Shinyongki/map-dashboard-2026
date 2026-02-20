import { useState, useCallback } from "react";
import type { ChatMessage } from "../lib/ai-types";

interface NomaSession {
    id: string;
    startedAt: string;
    summary: string; // 첫 번째 질문
    messages: ChatMessage[];
}

export interface NomaFeedback {
    id: string;
    question: string;
    answer: string;
    savedAt: string;
}

const KEY_SESSIONS = "noma_sessions";
const KEY_FEEDBACK = "noma_feedback";
const MAX_SESSIONS = 50;
const MAX_FEEDBACK = 500;

function load<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
}

export function useNomaMemory() {
    const [sessions, setSessions] = useState<NomaSession[]>(() =>
        load<NomaSession[]>(KEY_SESSIONS, [])
    );
    const [feedback, setFeedback] = useState<NomaFeedback[]>(() =>
        load<NomaFeedback[]>(KEY_FEEDBACK, [])
    );

    // 세션 저장 (대화 종료 시)
    const saveSession = useCallback((messages: ChatMessage[]) => {
        const userMessages = messages.filter((m) => m.role === "user");
        if (userMessages.length === 0) return;

        const session: NomaSession = {
            id: crypto.randomUUID(),
            startedAt: new Date().toISOString(),
            summary: userMessages[0].content.slice(0, 60),
            messages,
        };
        setSessions((prev) => {
            const updated = [session, ...prev].slice(0, MAX_SESSIONS);
            localStorage.setItem(KEY_SESSIONS, JSON.stringify(updated));
            return updated;
        });
    }, []);

    // 세션 삭제
    const deleteSession = useCallback((id: string) => {
        setSessions((prev) => {
            const updated = prev.filter((s) => s.id !== id);
            localStorage.setItem(KEY_SESSIONS, JSON.stringify(updated));
            return updated;
        });
    }, []);

    // 👍 피드백 저장
    const saveFeedback = useCallback((question: string, answer: string) => {
        const item: NomaFeedback = {
            id: crypto.randomUUID(),
            question: question.slice(0, 200),
            answer: answer.slice(0, 800),
            savedAt: new Date().toISOString(),
        };
        setFeedback((prev) => {
            const updated = [item, ...prev].slice(0, MAX_FEEDBACK);
            localStorage.setItem(KEY_FEEDBACK, JSON.stringify(updated));
            return updated;
        });
    }, []);

    // 👎 피드백 취소
    const removeFeedback = useCallback((id: string) => {
        setFeedback((prev) => {
            const updated = prev.filter((f) => f.id !== id);
            localStorage.setItem(KEY_FEEDBACK, JSON.stringify(updated));
            return updated;
        });
    }, []);

    // 시스템 프롬프트에 포함할 학습 컨텍스트
    const feedbackContext =
        feedback.length > 0
            ? `\n\n## 노마가 학습한 우수 답변 예시 (참고)\n` +
              feedback
                  .slice(0, 5)
                  .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
                  .join("\n\n")
            : "";

    return {
        sessions,
        feedback,
        saveSession,
        deleteSession,
        saveFeedback,
        removeFeedback,
        feedbackContext,
    };
}
