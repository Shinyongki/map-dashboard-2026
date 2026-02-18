
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Simulation of embedding generation (Mock)
// In a real scenario, this would call OpenAI's text-embedding-3-small or similar
export async function generateEmbedding(text: string): Promise<number[]> {
    // 1. Check for API Key (OpenAI)
    const apiKey = process.env.OPENAI_API_KEY;

    if (apiKey) {
        try {
            const response = await fetch('https://api.openai.com/v1/embeddings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    input: text,
                    model: 'text-embedding-3-small'
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`OpenAI API Error: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const data = await response.json() as any;
            return data.data[0].embedding;
        } catch (error) {
            console.error('Failed to generate real embedding:', error);
            // Fallback to mock if API fails
        }
    }

    // 2. Mock Fallback (Deterministic pseudo-random vector based on text length)
    // This allows "similar length" texts to have "similar" vectors for testing, 
    // though obviously not semantic similarity. 
    // For RAG to work properly, we need REAL embeddings.
    console.warn("Using MOCK embeddings. Semantic search will NOT work correctly.");
    return new Array(1536).fill(0).map((_, i) => Math.sin(text.length + i));
}
