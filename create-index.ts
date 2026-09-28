import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';

dotenv.config();

// Initialize the Cloud Client
const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || ''
});

async function provisionIndex() {
  try {
    const indexName = 'agentic-sprint';
    console.log(`🌲 [Pinecone Cloud]: Checking for existing indexes...`);

    // Fetch existing indexes to avoid naming crashes
    const existingIndexes = await pc.listIndexes();
    const indexExists = existingIndexes.indexes?.some(idx => idx.name === indexName);

    if (indexExists) {
      console.log(`✅ [Pinecone Cloud]: Index "${indexName}" already exists! Ready to roll.`);
      return;
    }

    console.log(`🚀 [Pinecone Cloud]: Creating index "${indexName}" with 768 dimensions...`);

    // Tell the cloud engine to configure a free serverless tier instance
    await pc.createIndex({
      name: indexName,
      dimension: 768, // Crucial: Matches Gemini Embeddings output dimensionality
      metric: 'cosine',
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-east-1' // Standard global free tier region
        }
      }
    });

    console.log(`🎉 [Pinecone Cloud]: Index successfully provisioned! Wait ~10 seconds for initialization.`);

  } catch (error) {
    console.error("❌ [Pinecone Setup Error]:", error);
  }
}

provisionIndex();
