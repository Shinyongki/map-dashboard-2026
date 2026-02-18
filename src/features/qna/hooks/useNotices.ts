
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./useAuth";
import type { Notice } from "@/features/qna/lib/types";

const API_Base = "http://localhost:3001/api";

export function useNotices(documentId?: string) {
    const { token } = useAuth();
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchNotices = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (documentId) params.append("documentId", documentId);

            const res = await fetch(`${API_Base}/notices?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setNotices(data);
            }
        } catch (error) {
            console.error("Failed to fetch notices:", error);
        } finally {
            setLoading(false);
        }
    }, [token, documentId]);

    const addNotice = async (content: string, category: Notice["category"], isActive: boolean, relatedDocumentId?: string) => {
        if (!token) return;
        try {
            const res = await fetch(`${API_Base}/notices`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ content, category, isActive, relatedDocumentId }),
            });
            if (res.ok) {
                fetchNotices();
                return true;
            }
        } catch (error) {
            console.error("Failed to add notice:", error);
        }
        return false;
    };

    const updateNotice = async (id: string, updates: Partial<Notice>) => {
        if (!token) return;
        try {
            const res = await fetch(`${API_Base}/notices/${id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(updates),
            });
            if (res.ok) {
                fetchNotices();
                return true;
            }
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
        refresh: fetchNotices,
        addNotice,
        updateNotice
    };
}
