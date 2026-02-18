
import { vectorStore } from '../src/services/vector-store';

async function main() {
    console.log('Testing RAG Retrieval...');

    // 1. Load Store
    await vectorStore.load();

    // 2. Search Query
    const query = "노인돌봄서비스 대상자 기준";
    console.log(`Query: "${query}"`);

    const results = await vectorStore.search(query);

    console.log(`\nFound ${results.length} results:`);
    results.forEach((r, i) => {
        console.log(`\n[${i + 1}] Similarity: ${r.similarity?.toFixed(4)}`);
        console.log(`Source: ${r.metadata.source}`);
        console.log(`Text Preview: ${r.text.substring(0, 100)}...`);
    });
}

main();
