
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

// Load .env manually
try {
    const envPath = path.resolve(process.cwd(), '.env');
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
} catch (e) {
    console.error("Error loading .env:", e);
}

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GOOGLE_GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY;

console.log("=== AI Connection Test Start ===");
console.log("Anthropic Key Present:", !!ANTHROPIC_API_KEY);
console.log("Gemini Key Present:", !!GOOGLE_GEMINI_API_KEY);

async function testAnthropic() {
    console.log("\n[Test] Anthropic API...");
    if (!ANTHROPIC_API_KEY) {
        console.log("Skipping Anthropic (No Key)");
        return;
    }

    try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            body: JSON.stringify({
                model: "claude-3-5-sonnet-20241022",
                max_tokens: 100,
                messages: [{ role: "user", content: "Hello" }]
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Anthropic Error Status:", response.status);
            console.error("Anthropic Error Body:", errorText);
        } else {
            const data = await response.json();
            console.log("Anthropic Success:", data.content[0]?.text);
        }
    } catch (e) {
        console.error("Anthropic Exception:", e);
    }
}

async function testGemini() {
    console.log("\n[Test] Gemini API...");
    if (!GOOGLE_GEMINI_API_KEY) {
        console.log("Skipping Gemini (No Key)");
        return;
    }

    try {
        const genAI = new GoogleGenerativeAI(GOOGLE_GEMINI_API_KEY);
        // Test with gemini-pro first
        console.log("Testing model: gemini-pro");
        const modelPro = genAI.getGenerativeModel({ model: "gemini-pro" });
        try {
            const resultPro = await modelPro.generateContent("Hello");
            console.log("Gemini Pro Success:", resultPro.response.text());
        } catch (e) {
            console.error("Gemini Pro Failed:", e.message);
        }

        // Test with gemini-1.5-flash
        console.log("Testing model: gemini-1.5-flash");
        const modelFlash = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        try {
            const resultFlash = await modelFlash.generateContent("Hello");
            console.log("Gemini Flash Success:", resultFlash.response.text());
        } catch (e) {
            console.error("Gemini Flash Failed:", e.message);
        }
    } catch (e) {
        console.error("Gemini Setup Exception:", e);
    }
}

(async () => {
    await testAnthropic();
    await testGemini();
    console.log("\n=== Test Finished ===");
})();
