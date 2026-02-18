import Anthropic from "@anthropic-ai/sdk";
import type { Question, OfficialDocument, FaqItem } from "../types";
import { generateGeminiContent, getGeminiClient } from "./gemini";

let client: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

import { vectorStore } from "./vector-store";

function buildSystemPrompt(
  relatedDoc: OfficialDocument | null,
  similarQAs: Question[],
  contextChunks: string[] = []
): string {
  let prompt = `당신은 경상남도 광역지원기관의 공문 Q&A 담당 AI 어시스턴트입니다.
사회복지사들의 질문에 대해 공문 원문 및 내부 지식 베이스를 참조하여 정확하고 친절한 답변 초안을 작성합니다.

답변 작성 시 주의사항:
- 제공된 [관련 공문] 및 [내부 지식 베이스]에 근거한 답변만 작성하세요
- 근거가 없는 내용은 "해당 내용은 확인되지 않습니다"라고 안내하세요
- 답변은 마크다운 형식으로 구조화해주세요
- 관련 조항이나 항목을 구체적으로 인용하세요
- 추가 확인이 필요한 사항은 명시해주세요
`;

  if (relatedDoc) {
    prompt += `\n## 관련 공문 정보
- 공문번호: ${relatedDoc.documentNumber}
- 제목: ${relatedDoc.title}

### 공문 원문 내용:
${relatedDoc.content}
`;
  }

  if (contextChunks.length > 0) {
    prompt += `\n## 내부 지식 베이스 (참고 자료)\n다음은 질문과 관련된 매뉴얼 및 규정 내용입니다:\n`;
    contextChunks.forEach((chunk, index) => {
      prompt += `\n[참고 ${index + 1}]\n${chunk}\n`;
    });
  }

  if (similarQAs.length > 0) {
    prompt += `\n## 기존 유사 Q&A 이력 (참고용)\n`;
    for (const qa of similarQAs.slice(0, 3)) {
      prompt += `\n### Q: ${qa.title}\n${qa.content}\n\n### A:\n${qa.finalAnswer || qa.aiDraftAnswer || "(미답변)"}\n`;
    }
  }

  return prompt;
}

export async function generateAIDraft(
  question: Question,
  relatedDoc: OfficialDocument | null,
  similarQAs: Question[]
): Promise<string> {
  // RAG: Load vector store and search for context
  let contextChunks: string[] = [];
  try {
    await vectorStore.load();
    const results = await vectorStore.search(question.content + " " + question.title, 3);
    contextChunks = results.map(r => r.text);
    console.log(`RAG: Found ${results.length} relevant chunks for question "${question.title}"`);
  } catch (err) {
    console.warn("RAG: Failed to search vector store:", err);
  }

  const systemPrompt = buildSystemPrompt(relatedDoc, similarQAs, contextChunks);
  const userMessage = `## 질문
**제목**: ${question.title}
**카테고리**: ${question.category}
**기관**: ${question.authorOrgName}

**질문 내용**:
${question.content}

위 질문에 대한 답변 초안을 작성해주세요.`;

  // Try Gemini First
  const gemini = getGeminiClient();
  if (gemini) {
    try {
      console.log("AI: Generating draft using Gemini...");
      return await generateGeminiContent(systemPrompt, userMessage);
    } catch (err) {
      console.error("Gemini failed, trying Claude fallback...", err);
    }
  }

  // Fallback to Claude
  const anthropic = getClient();
  if (anthropic) {
    console.log("AI: Generating draft using Claude...");
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });
    const textBlock = response.content.find((b: any) => b.type === "text");
    if (textBlock && textBlock.type === "text") return textBlock.text;
  }

  // Mock response when no API keys are configured
  const ragContextNote = contextChunks.length > 0
    ? `\n\n(참고: 내부 지식 베이스에서 ${contextChunks.length}개의 관련 규정을 확인했습니다.)`
    : "";

  const mockAnswers: Record<string, string> = {
    사업지침: `공문 원문 및 지식 베이스를 검토한 결과, 질문하신 내용에 대해 다음과 같이 안내드립니다.

**주요 답변 내용:**
1. 해당 사업지침에 따르면, 관련 규정이 적용됩니다
2. 세부 사항은 사업안내서를 참고해주세요
3. 추가 문의사항이 있으시면 광역지원기관으로 연락 부탁드립니다

> 이 답변은 AI가 자동 생성한 초안입니다. 관리자 검토 후 최종 답변이 전달됩니다.${ragContextNote}`,
    행정절차: `행정절차 관련 문의에 대해 안내드립니다.

**처리 절차:**
1. 해당 서류를 준비하여 제출합니다
2. 담당부서에서 검토 후 결과를 통보합니다
3. 처리 기간은 통상 7~14일 소요됩니다

> 이 답변은 AI가 자동 생성한 초안입니다. 관리자 검토 후 최종 답변이 전달됩니다.${ragContextNote}`,
  };
  return mockAnswers[question.category] || mockAnswers["사업지침"];
}

// ─── Document Summary Generation ─────────────────────────────
export interface DocumentSummaryResult {
  summary: string;
  targetType: "전체" | "거점" | "일반";
  faqDrafts: { question: string; answer: string }[];
}

export async function generateDocumentSummary(
  content: string
): Promise<DocumentSummaryResult> {
  const systemPrompt = `당신은 경상남도 노인맞춤돌봄서비스 광역지원기관의 공문 분석 AI입니다.
공문 내용을 분석하여 다음 정보를 JSON 형식으로 반환하세요:

1. summary: 공문의 핵심 내용을 3~5문장으로 요약
2. targetType: 대상 기관 유형 ("전체" / "거점" / "일반")
   - 단기집중서비스 관련이면 "거점"
   - 특정 기관 유형만 해당이면 "일반"
   - 그 외 모든 기관 해당이면 "전체"
3. faqDrafts: 현장 사회복지사가 자주 물어볼 FAQ 3개 초안
   - 각 항목은 { question, answer } 형식

반드시 유효한 JSON만 반환하세요. 마크다운 코드블록이나 설명 텍스트 없이 순수 JSON만 출력하세요.`;

  const userPrompt = `다음 공문 내용을 분석해주세요:\n\n${content}`;

  // Try Gemini
  const gemini = getGeminiClient();
  if (gemini) {
    try {
      const responseText = await generateGeminiContent(systemPrompt, userPrompt);
      // Gemini sometimes includes markdown code blocks, strip them
      const cleanedJson = responseText.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(cleanedJson) as DocumentSummaryResult;
      if (["전체", "거점", "일반"].includes(parsed.targetType)) return parsed;
    } catch (err) {
      console.error("Gemini summary failed:", err);
    }
  }

  // Fallback to Claude
  const anthropic = getClient();
  if (anthropic) {
    try {
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });
      const textBlock = response.content.find((b: any) => b.type === "text");
      if (textBlock && textBlock.type === "text") {
        const parsed = JSON.parse(textBlock.text) as DocumentSummaryResult;
        return parsed;
      }
    } catch (err) {
      console.error("Claude summary failed:", err);
    }
  }

  // Mock response
  return {
    summary: `[AI 자동 요약] ${content.slice(0, 100)}... (API 키 미설정)`,
    targetType: "전체",
    faqDrafts: [
      {
        question: "이 공문의 주요 변경사항은 무엇인가요?",
        answer: `공문 내용에 따르면 주요 변경사항은 다음과 같습니다:\n${content.slice(0, 200)}`,
      },
    ],
  };
}

// ─── FAQ Cache Matching ──────────────────────────────────────
export function findSimilarFaq(
  question: string,
  faqItems: FaqItem[]
): FaqItem | null {
  const approvedFaqs = faqItems.filter((f) => f.status === "승인");
  if (approvedFaqs.length === 0) return null;

  // Tokenize the incoming question (split on whitespace, remove particles)
  const tokenize = (text: string): string[] =>
    text
      .replace(/[?？!.,'""''()（）\[\]을를이가은는의에서도로으며고]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 2)
      .map((w) => w.toLowerCase());

  const queryTokens = tokenize(question);
  if (queryTokens.length === 0) return null;

  let bestMatch: FaqItem | null = null;
  let bestScore = 0;

  for (const faq of approvedFaqs) {
    const faqTokens = tokenize(faq.question);
    if (faqTokens.length === 0) continue;

    // Count overlapping tokens (union direction: how many faq tokens appear in query)
    const matchCount = faqTokens.filter((kw) =>
      queryTokens.some((qt) => qt.includes(kw) || kw.includes(qt))
    ).length;

    const score = matchCount / faqTokens.length;
    if (score >= 0.4 && score > bestScore) {
      bestScore = score;
      bestMatch = faq;
    }
  }

  return bestMatch;
}

// ─── Instant Answer Generation ───────────────────────────────
export async function generateInstantAnswer(
  question: string,
  document: OfficialDocument,
  approvedFaqs: { question: string; answer: string }[]
): Promise<string> {
  const systemPrompt = `당신은 경상남도 광역지원기관의 공문 Q&A 담당 AI입니다.
반드시 공문 원문에 근거해서 답변하세요.
원문에 없는 내용은 답변하지 말고 '해당 내용은 공문에 명시되어 있지 않습니다'라고 안내하세요.
답변 끝에 항상 '[${document.documentNumber} 공문 기준]' 출처를 표시하세요.

## 공문 정보
- 제목: ${document.title}
- 공문번호: ${document.documentNumber}

### 공문 원문:
${document.content}
`;

  let fullPrompt = question;
  if (approvedFaqs.length > 0) {
    fullPrompt = `참고할 만한 기존 FAQ:\n${approvedFaqs.map(f => `Q: ${f.question}\nA: ${f.answer}`).join("\n")}\n\n질문: ${question}`;
  }

  // Try Gemini
  const gemini = getGeminiClient();
  if (gemini) {
    try {
      return await generateGeminiContent(systemPrompt, fullPrompt);
    } catch (err) {
      console.error("Gemini instant answer failed:", err);
    }
  }

  // Fallback to Claude
  const anthropic = getClient();
  if (anthropic) {
    try {
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: "user", content: fullPrompt }],
      });
      const textBlock = response.content.find((b: any) => b.type === "text");
      if (textBlock && textBlock.type === "text") return textBlock.text;
    } catch (err) {
      console.error("Claude instant answer failed:", err);
    }
  }

  return `**[AI 답변]**\n\n${document.title} 공문을 기준으로 답변드립니다.\n\n질문하신 "${question}"에 대해:\n공문 원문에 따르면, 해당 내용은 다음과 같습니다.\n\n${document.content.slice(0, 300)}\n\n> 자세한 사항은 공문 원문을 참고해주세요.\n\n[${document.documentNumber} 공문 기준]`;
}


