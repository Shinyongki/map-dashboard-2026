import { useState, useCallback } from "react";
import { api } from "@/features/qna/api/client";
import type { UserSession } from "@/features/qna/lib/types";

const STORAGE_KEY = "qna_user_session";

interface StoredSession {
    token: string;
    user: UserSession;
}

export function useAuth() {
    const [session, setSession] = useState<UserSession | null>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) return null;
            const parsed = JSON.parse(stored) as StoredSession;
            return parsed.user;
        } catch {
            return null;
        }
    });

    const login = useCallback(
        async (code: string, name: string) => {
            const result = await api.post<{ token: string; user: UserSession }>(
                "/auth/login",
                { code, name }
            );
            const stored: StoredSession = {
                token: result.token,
                user: result.user,
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
            setSession(result.user);
            return result.user;
        },
        []
    );

    const logout = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
        setSession(null);
    }, []);

    return { session, login, logout, isAdmin: session?.role === "admin" };
}

