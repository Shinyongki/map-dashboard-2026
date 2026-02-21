import { useState, useCallback } from "react";
import type { ChatMessage } from "../lib/ai-types";

export interface NomaSession {
    id: string;
    startedAt: string;
    summary: string;
    messages: ChatMessage[];
    tripleMode?: boolean; // 3자 대화 세션 여부
}

export interface NomaFeedback {
    id: string;
    question: string;
    answer: string;
    savedAt: string;
}

const KEY_SESSIONS = "noma_sessions";
const KEY_FEEDBACK = "noma_feedback";
const KEY_ACTIVE = "noma_active_session"; // 진행 중인 대화 자동 저장
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
    const saveSession = useCallback((messages: ChatMessage[], tripleMode = false) => {
        const userMessages = messages.filter((m) => m.role === "user");
        if (userMessages.length === 0) return;

        const session: NomaSession = {
            id: crypto.randomUUID(),
            startedAt: new Date().toISOString(),
            summary: userMessages[0].content.slice(0, 60),
            messages,
            tripleMode,
        };
        setSessions((prev) => {
            const updated = [session, ...prev].slice(0, MAX_SESSIONS);
            localStorage.setItem(KEY_SESSIONS, JSON.stringify(updated));
            return updated;
        });

        // 활성 세션 초기화
        localStorage.removeItem(KEY_ACTIVE);
    }, []);

    // 진행 중인 대화 자동 저장 (페이지 이탈/새로고침 대비)
    const saveActiveSession = useCallback((messages: ChatMessage[], tripleMode = false) => {
        if (messages.length < 2) {
            localStorage.removeItem(KEY_ACTIVE);
            return;
        }
        localStorage.setItem(KEY_ACTIVE, JSON.stringify({ messages, tripleMode }));
    }, []);

    // 진행 중인 대화 복원
    const loadActiveSession = useCallback((): { messages: ChatMessage[]; tripleMode: boolean } | null => {
        const raw = localStorage.getItem(KEY_ACTIVE);
        if (!raw) return null;
        try {
            const data = JSON.parse(raw);
            // timestamp 복원
            data.messages = data.messages.map((m: ChatMessage) => ({
                ...m,
                timestamp: new Date(m.timestamp),
            }));
            return data;
        } catch {
            return null;
        }
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
        saveActiveSession,
        loadActiveSession,
        deleteSession,
        saveFeedback,
        removeFeedback,
        feedbackContext,
    };
}
