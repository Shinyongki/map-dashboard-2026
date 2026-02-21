// ── Code Tasks API (대화창 세나 → 터미널 세나 협업) ──────────────────
export interface CodeTask {
    id: string;
    type: "bug_fix" | "feature_request" | "analysis" | "question";
    title: string;
    description: string;
    context: string;
    status: "pending" | "resolved";
    proposedBy: "sena";
    timestamp: string;
    resolution?: string;
    resolvedAt?: string;
}

export async function fetchCodeTasks(): Promise<CodeTask[]> {
    try {
        const res = await fetch("/qna-api/code-tasks");
        if (!res.ok) return [];
        return res.json();
    } catch {
        return [];
    }
}

export async function deleteCodeTask(id: string): Promise<boolean> {
    try {
        const res = await fetch(`/qna-api/code-tasks/${id}`, { method: "DELETE" });
        return res.ok;
    } catch {
        return false;
    }
}

// ── Prompt Patches API ───────────────────────────────────────────
export interface PromptPatch {
    id: string;
    title: string;
    content: string;
    proposedBy: "sena" | "manual";
    timestamp: string;
}

export async function fetchPromptPatches(): Promise<PromptPatch[]> {
    try {
        const res = await fetch("/qna-api/prompt-patches");
        if (!res.ok) return [];
        return res.json();
    } catch {
        return [];
    }
}

export async function deletePromptPatch(id: string): Promise<boolean> {
    try {
        const res = await fetch(`/qna-api/prompt-patches/${id}`, { method: "DELETE" });
        return res.ok;
    } catch {
        return false;
    }
}

export type TripleChunk =
    | { source: "noma" | "claude"; text: string; done?: never }
    | { source: "noma"; done: true; text?: never }
    | { error: string };

export async function* streamTripleChatResponse(
    messages: Array<{ role: "user" | "assistant" | "noma" | "claude"; content: string }>,
    systemPrompt: string
): AsyncGenerator<TripleChunk, void, undefined> {
    try {
        const response = await fetch("/qna-api/triple-chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages, systemPrompt }),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: response.statusText }));
            throw new Error(err.error || `API 오류 (${response.status})`);
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
                if (!line.startsWith("data: ")) continue;
                const data = line.slice(6).trim();
                if (data === "[DONE]") return;
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.error) throw new Error(parsed.error);
                    // source가 noma/claude 가 아닌 system 청크는 무시 (tool_use 알림 등)
                    if (parsed.source !== "noma" && parsed.source !== "claude") continue;
                    yield parsed as TripleChunk;
                } catch (e: any) {
                    if (e.message && !e.message.includes("JSON")) throw e;
                }
            }
        }
    } catch (err: any) {
        yield { error: `AI 응답 생성에 실패했습니다: ${err.message}` };
    }
}

// ── Unified Session API ──────────────────────────────────────────
export interface UnifiedEntry {
    role: "user" | "noma" | "sena" | "insight" | "decision" | "action";
    content: string;
    timestamp: string;
}

export async function fetchUnifiedSession(): Promise<UnifiedEntry[]> {
    try {
        const res = await fetch("/qna-api/unified-session");
        if (!res.ok) return [];
        return res.json();
    } catch {
        return [];
    }
}

export async function clearUnifiedSession(): Promise<void> {
    await fetch("/qna-api/unified-session", { method: "DELETE" });
}

export async function* streamChatResponse(
    messages: Array<{ role: "user" | "assistant"; content: string }>,
    systemPrompt: string
): AsyncGenerator<string, void, undefined> {
    try {
        const response = await fetch("/qna-api/ai-chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages, systemPrompt }),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: response.statusText }));
            throw new Error(err.error || `API 오류 (${response.status})`);
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
                if (!line.startsWith("data: ")) continue;
                const data = line.slice(6).trim();
                if (data === "[DONE]") return;
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.error) throw new Error(parsed.error);
                    if (parsed.text) yield parsed.text;
                } catch (e: any) {
                    if (e.message && !e.message.includes("JSON")) throw e;
                }
            }
        }
    } catch (err: any) {
        yield `\n\n[오류] AI 응답 생성에 실패했습니다: ${err.message}`;
    }
}
