import { useState, useEffect, useCallback } from "react";
import { api } from "@/features/qna/api/client";
import type { Notice } from "@/features/qna/lib/types";

export function useNotices(documentId?: string) {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchNotices = useCallback(async () => {
        setLoading(true);
        try {
            const url = documentId
                ? `/notices?documentId=${documentId}`
                : '/notices';

            const data = await api.get<Notice[]>(url);
            setNotices(data);
            setError(null);
        } catch (err) {
            console.error("Failed to fetch notices:", err);
            setError(err instanceof Error ? err.message : "공지사항 로딩 실패");
        } finally {
            setLoading(false);
        }
    }, [documentId]);

    const addNotice = async (content: string, category: Notice["category"], isActive: boolean, relatedDocumentId?: string) => {
        try {
            const result = await api.post<{ success: boolean }>("/notices", {
                content,
                category,
                isActive,
                relatedDocumentId
            });
            if (result.success) {
                fetchNotices();
                return true;
            }
        } catch (error) {
            console.error("Failed to add notice:", error);
        }
        return false;
    };

    const updateNotice = async (id: string, updates: Partial<Notice>) => {
        try {
            await api.patch(`/notices/${id}`, updates);
            fetchNotices();
            return true;
        } catch (error) {
            console.error("Failed to update notice:", error);
        }
        return false;
    };

    useEffect(() => {
        fetchNotices();
    }, [fetchNotices]);

    return {
        notices,
        loading,
        error,
        refresh: fetchNotices,
        addNotice,
        updateNotice
    };
}
