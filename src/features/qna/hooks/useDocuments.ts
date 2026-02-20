import { useState, useEffect, useCallback } from "react";
import { api } from "@/features/qna/api/client";
import type { OfficialDocument } from "@/features/qna/lib/types";

export function useDocuments() {
    const [documents, setDocuments] = useState<OfficialDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.get<OfficialDocument[]>("/documents");
            setDocuments(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "문서 목록 로딩 실패");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const upload = useCallback(
        async (
            files: File | File[],
            metadata: {
                title: string;
                documentNumber: string;
                managerName?: string;
                managerPhone?: string;
                uploadedBy: string;
            },
            manualContent?: string
        ) => {
            setUploading(true);
            try {
                const formData = new FormData();
                const fileArray = Array.isArray(files) ? files : [files];
                fileArray.forEach((f) => {
                    formData.append("files", f);
                });

                formData.append("title", metadata.title);
                formData.append("documentNumber", metadata.documentNumber);
                if (metadata.managerName) formData.append("managerName", metadata.managerName);
                if (metadata.managerPhone) formData.append("managerPhone", metadata.managerPhone);
                if (manualContent) {
                    formData.append("content", manualContent);
                }

                const result = await api.post<{ success: boolean; count?: number }>("/documents", formData);
                await refresh();
                return result;
            } catch (err) {
                setError(err instanceof Error ? err.message : "업로드 실패");
                throw err;
            } finally {
                setUploading(false);
            }
        },
        [refresh]
    );

    const update = useCallback(
        async (id: string, data: Partial<OfficialDocument> | FormData) => {
            try {
                await api.patch(`/documents/${id}`, data);
                await refresh();
            } catch (err) {
                setError(err instanceof Error ? err.message : "수정 실패");
                throw err;
            }
        },
        [refresh]
    );

    const remove = useCallback(
        async (id: string) => {
            await api.delete(`/documents/${id}`);
            await refresh();
        },
        [refresh]
    );

    const setValidUntil = useCallback(
        async (id: string, validUntil: string) => {
            await api.patch(`/documents/${id}/valid-until`, { validUntil });
            await refresh();
        },
        [refresh]
    );

    return { documents, loading, uploading, error, refresh, upload, update, remove, setValidUntil };
}
