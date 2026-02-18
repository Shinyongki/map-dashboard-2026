import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI: GoogleGenerativeAI | null = null;

export function getGeminiClient(): GoogleGenerativeAI | null {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) return null;

    if (!genAI) {
        genAI = new GoogleGenerativeAI(apiKey);
    }
    return genAI;
}

export async function generateGeminiContent(
    systemPrompt: string,
    userPrompt: string,
    modelName: string = "gemini-1.5-flash"
): Promise<string> {
    const client = getGeminiClient();
    if (!client) throw new Error("Google Gemini API Key is not configured");

    const model = client.getGenerativeModel({
        model: modelName,
        systemInstruction: systemPrompt,
    });

    const result = await model.generateContent(userPrompt);
    const response = await result.response;
    return response.text();
}
