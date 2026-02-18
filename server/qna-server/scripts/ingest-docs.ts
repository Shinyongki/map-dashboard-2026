
import fs from 'fs/promises';
import path from 'path';
import { vectorStore } from '../src/services/vector-store';

const DOCS_DIR = path.resolve(__dirname, '../documents');

async function main() {
    console.log('Starting document ingestion...');

    // 1. Load Vector Store
    await vectorStore.load();

    // 2. Read documents
    try {
        const files = await fs.readdir(DOCS_DIR);
        const targetFiles = files.filter(f => f.endsWith('.txt') || f.endsWith('.md'));

        if (targetFiles.length === 0) {
            console.log('No .txt or .md files found in documents directory.');
            return;
        }

        for (const file of targetFiles) {
            console.log(`Processing ${file}...`);
            const updateTime = new Date().toISOString();
            const content = await fs.readFile(path.join(DOCS_DIR, file), 'utf-8');
            const isMarkdown = file.endsWith('.md');

            let chunks: string[] = [];

            if (isMarkdown) {
                // Markdown Chunking Strategy: Split by headers (#, ##, ###)
                // This regex looks for lines starting with 1-3 hashes followed by a space
                const sections = content.split(/(?=^#{1,3}\s)/gm);

                chunks = sections
                    .map(s => s.trim())
                    .filter(s => s.length > 50); // Filter out too short sections (e.g. just headers)
            } else {
                // Text Chunking Strategy: Simple paragraph split
                chunks = content.split('\n\n').filter(c => c.trim().length > 50);
            }

            console.log(`- Extracted ${chunks.length} chunks from ${file}`);

            for (const chunkText of chunks) {
                // Add header info to metadata if available (simple heuristic)
                const headerMatch = chunkText.match(/^#{1,3}\s+(.+)$/m);
                const sectionTitle = headerMatch ? headerMatch[1] : 'General';

                await vectorStore.addDocument(chunkText, {
                    source: file,
                    section: sectionTitle,
                    fileType: isMarkdown ? 'markdown' : 'text',
                    ingestedAt: updateTime
                });
            }
        }

        // 4. Save Vector Store
        await vectorStore.save();
        console.log('Ingestion complete.');

    } catch (error) {
        console.error('Ingestion failed:', error);
    }
}

main();
