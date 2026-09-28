import { Pinecone, RecordMetadata } from '@pinecone-database/pinecone';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY || ''
});

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const index = pc.index<RecordMetadata>('agentic-sprint');

const TARGET_FOLDER = path.join(
    process.cwd(),
    'mock-repo',
    'src'
);

const CHUNK_SIZE = 100;


function getTypeScriptFiles(dir: string): string[] {

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
        const fullPath = path.join(
            dir,
            entry.name
        );

        if (entry.isDirectory()) {

            files.push(
                ...getTypeScriptFiles(fullPath)
            );

        } else if (
            entry.isFile() &&
            entry.name.endsWith('.ts')
        ) {

            files.push(fullPath);
        }
    }

    return files;
}


function createChunks(
    content: string
): string[] {

    const lines = content.split('\n');

    const chunks: string[] = [];

    for (
        let i = 0;
        i < lines.length;
        i += CHUNK_SIZE
    ) {

        const chunk = lines
            .slice(i, i + CHUNK_SIZE)
            .join('\n')
            .trim();

        if (chunk) {
            chunks.push(chunk);
        }
    }

    return chunks;
}


async function processAndIngestCodebase() {

    try {

        console.log(
            '📂 [Ingestion Engine]: Scanning source code...'
        );

        const files =
            getTypeScriptFiles(TARGET_FOLDER);

        console.log(
            `📄 [Ingestion Engine]: Found ${files.length} TypeScript files.`
        );


        let totalChunks = 0;


        for (const filePath of files) {
            const codeContent = fs.readFileSync(filePath, 'utf-8');
            const relativePath = path.relative(process.cwd(), filePath);
            console.log(`\n📄 Processing: ${relativePath}`);
            const chunks = createChunks(codeContent);
            console.log(`🧩 Created ${chunks.length} chunks`);
            for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
                const chunk = chunks[chunkIndex];
                console.log(`🧠 Generating embedding ${chunkIndex + 1}/${chunks.length}...`);
                const embeddingResponse = await ai.models.embedContent({
                    model: 'gemini-embedding-001',
                    contents: chunk,
                    config: {
                        outputDimensionality: 768
                    }
                });

                const vectorValues = embeddingResponse.embeddings?.[0]?.values;


                if (!vectorValues || vectorValues.length !== 768) {
                    throw new Error(
                        `Invalid embedding for ${relativePath} chunk ${chunkIndex}`
                    );
                }

                const vectorId = `${relativePath}::chunk-${chunkIndex}`;


                console.log(
                    `🌲 Uploading to Pinecone: ${vectorId}`
                );

                await index.upsert({
                    records: [
                        {
                            id: vectorId,
                            values: vectorValues,
                            metadata: {
                                filePath: relativePath,
                                chunkIndex: chunkIndex,
                                codeSnippet: chunk
                            }
                        }
                    ]
                });
                totalChunks++;
                console.log(`✅ Indexed: ${vectorId}`);
            }
        }


        console.log(
            `\n🎉 Ingestion complete!`
        );

        console.log(
            `📊 Files indexed: ${files.length}`
        );

        console.log(
            `🧩 Total chunks indexed: ${totalChunks}`
        );


    } catch (error) {

        console.error(
            '❌ [Ingestion Failure]:',
            error
        );
    }
}


processAndIngestCodebase();
