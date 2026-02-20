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

        const data = await response.json();
        const text: string = data.text || "";

        // 스트리밍 효과 (청크 단위로 yield)
        const chunkSize = 5;
        for (let i = 0; i < text.length; i += chunkSize) {
            yield text.slice(i, i + chunkSize);
            await new Promise((r) => setTimeout(r, 8));
        }
    } catch (err: any) {
        yield `\n\n[오류] AI 응답 생성에 실패했습니다: ${err.message}`;
    }
}
