const BASE_URL = "/qna-api";

function getToken(): string | null {
    const session = localStorage.getItem("qna_user_session");
    if (!session) return null;
    try {
        return JSON.parse(session).token;
    } catch {
        return null;
    }
}

async function request<T>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const token = getToken();
    const headers: Record<string, string> = {
        ...(options.headers as Record<string, string>),
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    // Only set Content-Type for non-FormData bodies
    if (options.body && !(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }

    const res = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers,
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(error.error || `HTTP ${res.status}`);
    }

    return res.json();
}

export const api = {
    get: <T>(path: string) => request<T>(path),

    post: <T>(path: string, body?: unknown) =>
        request<T>(path, {
            method: "POST",
            body: body instanceof FormData ? body : JSON.stringify(body),
        }),

    patch: <T>(path: string, body: unknown) =>
        request<T>(path, {
            method: "PATCH",
            body: body instanceof FormData ? body : JSON.stringify(body),
        }),

    delete: <T>(path: string) =>
        request<T>(path, { method: "DELETE" }),
};
