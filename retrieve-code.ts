import { Pinecone, RecordMetadata } from '@pinecone-database/pinecone';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY || '' });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const index = pc.index<RecordMetadata>('agentic-sprint');
async function retrieveRelevantCode(query: string) {
    try {
        console.log(`🔎 Query: ${query}`);
        // 1. Convert user query into embedding
        console.log('🧠 Generating query embedding...');
        const embeddingResponse = await ai.models.embedContent({
            model: 'gemini-embedding-001',
            contents: query,
            config: {
                outputDimensionality: 768
            }
        });
        const queryVector = embeddingResponse.embeddings?.[0]?.values;
        if (!queryVector || queryVector.length !== 768) {
            throw new Error('Failed to generate query embedding.');
        }
        // 2. Search Pinecone
        console.log('🌲 Searching Pinecone...');

        const searchResult = await index.query({
            vector: queryVector,
            topK: 5,
            includeMetadata: true
        });
        // 3. Display results
        console.log('\n🎯 Relevant code:\n');
        if (!searchResult.matches || searchResult.matches.length === 0) {
            console.log('No relevant code found.');
            return;
        }
        for (let i = 0; i < searchResult.matches.length; i++) {
            const match = searchResult.matches[i];
            console.log(`\n#${i + 1}`);
            console.log(`📄 File: ${match.metadata?.filePath}`);
            console.log(`📊 Score: ${match.score}`);
            console.log('📝 Code:');
            console.log(match.metadata?.codeSnippet);
            console.log('-----------------------------------');
        }
    } catch (error) {
        console.error('❌ Retrieval failed:', error);
    }
}

const query = process.argv.slice(2).join(' ');
if (!query) {
    console.error('❌ Please provide a search query.');
    console.log('Example: npx tsx retrieve-code.ts "restaurant creation bug"');
    process.exit(1);
}

retrieveRelevantCode(query);