import { useState, useEffect, useCallback } from "react";
import { api } from "@/features/qna/api/client";
import type { Question, QuestionStatus } from "@/features/qna/lib/types";

export function useQuestions(filters?: { status?: QuestionStatus; relatedDocumentId?: string }) {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters?.status) params.set("status", filters.status);
            if (filters?.relatedDocumentId) params.set("relatedDocumentId", filters.relatedDocumentId);
            const path = `/questions${params.toString() ? `?${params}` : ""}`;
            const data = await api.get<Question[]>(path);
            setQuestions(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "질문 목록 로딩 실패");
        } finally {
            setLoading(false);
        }
    }, [filters?.status, filters?.relatedDocumentId]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const submitQuestion = useCallback(
        async (data: {
            title: string;
            content: string;
            category: Question["category"];
            relatedDocumentId?: string;
            authorName: string;
            authorOrg: string;
            authorOrgName: string;
            isPublic: boolean;
        }) => {
            const result = await api.post<{ id: string }>("/questions", data);
            await refresh();
            return result.id;
        },
        [refresh]
    );

    const approveAnswer = useCallback(
        async (id: string, answer: string, author: string) => {
            // Backend expects 'answer' field for final answer, and 'answerAuthor' for author
            // Based on db.ts Question interface: answer?: string; answerAuthor?: string;
            await api.patch(`/questions/${id}`, {
                answer,
                answerAuthor: author,
                status: "answered",
            });
            await refresh();
        },
        [refresh]
    );

    const closeQuestion = useCallback(
        async (id: string) => {
            await api.patch(`/questions/${id}`, { status: "closed" });
            await refresh();
        },
        [refresh]
    );

    const removeQuestion = useCallback(
        async (id: string) => {
            await api.delete(`/questions/${id}`);
            await refresh();
        },
        [refresh]
    );

    return {
        questions,
        loading,
        error,
        refresh,
        submitQuestion,
        approveAnswer,
        closeQuestion,
        removeQuestion,
    };
}
