
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { generateEmbedding } from './embeddings';

export interface DocumentChunk {
    id: string;
    text: string;
    metadata: Record<string, any>;
    embedding: number[];
}

export class VectorStore {
    private chunks: DocumentChunk[] = [];
    private filePath: string;

    constructor(filePath: string = path.resolve(__dirname, '../../data/vector-store.json')) {
        this.filePath = filePath;
    }

    async load() {
        try {
            await fs.mkdir(path.dirname(this.filePath), { recursive: true });
            const data = await fs.readFile(this.filePath, 'utf-8');
            this.chunks = JSON.parse(data);
            console.log(`Loaded ${this.chunks.length} chunks from vector store.`);
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                console.log('No existing vector store found. Starting fresh.');
                this.chunks = [];
            } else {
                console.error('Failed to load vector store:', error);
                throw error;
            }
        }
    }

    async save() {
        try {
            await fs.mkdir(path.dirname(this.filePath), { recursive: true });
            await fs.writeFile(this.filePath, JSON.stringify(this.chunks, null, 2));
            console.log(`Saved ${this.chunks.length} chunks to vector store.`);
        } catch (error) {
            console.error('Failed to save vector store:', error);
            throw error;
        }
    }

    async addDocument(text: string, metadata: Record<string, any>) {
        const embedding = await generateEmbedding(text);
        const chunk: DocumentChunk = {
            id: crypto.randomUUID(),
            text,
            metadata,
            embedding
        };
        this.chunks.push(chunk);
    }

    async search(query: string, topK: number = 3): Promise<DocumentChunk[]> {
        const queryEmbedding = await generateEmbedding(query);

        // Calculate Cosine Similarity
        const similarities = this.chunks.map(chunk => {
            const similarity = this.cosineSimilarity(queryEmbedding, chunk.embedding);
            return { ...chunk, similarity };
        });

        // Sort by similarity descending
        similarities.sort((a, b) => b.similarity - a.similarity);

        return similarities.slice(0, topK);
    }

    private cosineSimilarity(vecA: number[], vecB: number[]): number {
        const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
        const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
        const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
        return dotProduct / (magnitudeA * magnitudeB);
    }
}

// Singleton instance
export const vectorStore = new VectorStore();
