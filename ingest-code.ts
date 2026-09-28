import { Pinecone, RecordMetadata } from '@pinecone-database/pinecone';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY || '' });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const index = pc.index<RecordMetadata>('agentic-sprint');

async function processAndIngestCodebase() {
  try {
    const targetFolder = path.join(__dirname, 'mock-repo');
    const files = fs.readdirSync(targetFolder);

    console.log(`📂 [Ingestion Engine]: Scanning directory structure for files...`);

    for (const file of files) {
      const filePath = path.join(targetFolder, file);
      const codeContent = fs.readFileSync(filePath, 'utf-8');

      console.log(`📄 [Ingestion Engine]: Processing file contents: ${file}`);
      console.log(`🧠 [Ingestion Engine]: Requesting vector from new Gemini Embedding API...`);
      
      // ✅ FIXED: Switched to the modern 'gemini-embedding-001' and explicitly set dimensionality to 768
      const embeddingResponse = await ai.models.embedContent({
        model: 'gemini-embedding-001',
        contents: codeContent,
        config: {
          outputDimensionality: 768
        }
      });

      // Handle structural output changes in the latest SDK
      const embeddingsArray = embeddingResponse.embeddings || (embeddingResponse.embedding ? [embeddingResponse.embedding] : []);
      const vectorValues = embeddingsArray[0]?.values;

      if (!vectorValues) throw new Error(`Failed to generate embeddings vector for file ${file}`);

      console.log(`🌲 [Pinecone Cloud]: Seeding mathematical tracking vectors...`);

      await index.upsert({
        records: [
          {
            id: file,
            values: vectorValues,
            metadata: {
              filePath: `mock-repo/${file}`,
              codeSnippet: codeContent
            }
          }
        ]
      });

      console.log(`✅ [Ingestion Engine]: Successfully indexed: ${file}`);
    }

    console.log("🎉 [Ingestion Engine]: All repository layers mapped and uploaded securely!");

  } catch (error) {
    console.error("❌ [Ingestion Failure]:", error);
  }
}

processAndIngestCodebase();
