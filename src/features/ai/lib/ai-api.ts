const MOCK_RESPONSES: Record<string, string> = {
    default: `## 분석 결과

경남 18개 시군의 데이터를 종합적으로 분석했습니다.

### 주요 발견사항
- **돌봄 현황**: 창원시, 김해시, 양산시가 종사자 및 이용자 수에서 가장 높은 비중을 차지합니다.
- **기후 대응**: 최근 5년간 폭염 특보가 증가 추세이며, 내륙 지역(밀양시, 합천군)에서 특히 두드러집니다.
- **자연재난**: 남해안 지역(통영시, 거제시, 남해군)이 태풍 피해에 가장 취약한 것으로 나타납니다.

> 이 응답은 API 키가 설정되지 않아 **목업 데이터**로 생성되었습니다. 실제 Claude API를 연동하려면 \`.env\` 파일에 \`VITE_ANTHROPIC_API_KEY\`를 설정해주세요.`,
};

function getMockResponse(): string {
    return MOCK_RESPONSES.default;
}

export async function* streamChatResponse(
    messages: Array<{ role: "user" | "assistant"; content: string }>,
    systemPrompt: string
): AsyncGenerator<string, void, undefined> {
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

    if (!apiKey) {
        // Mock: simulate streaming by yielding chunks
        const mockText = getMockResponse();
        const words = mockText.split(" ");
        for (const word of words) {
            await new Promise((r) => setTimeout(r, 30));
            yield word + " ";
        }
        return;
    }

    const response = await fetch("/anthropic-api/v1/messages", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
            model: "claude-sonnet-4-5-20250929",
            max_tokens: 4096,
            system: systemPrompt,
            messages,
            stream: true,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API 요청 실패 (${response.status}): ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("응답 스트림을 읽을 수 없습니다");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") return;

            try {
                const event = JSON.parse(data);
                if (
                    event.type === "content_block_delta" &&
                    event.delta?.type === "text_delta"
                ) {
                    yield event.delta.text;
                }
            } catch {
                // skip unparseable lines
            }
        }
    }
}
