import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Connect using the URL defined in your .env file
const client = new Client({
    connectionString: process.env.DATABASE_URL
});

async function initDB() {
    try {
        await client.connect();
        console.log("🔌 [Database Container]: Connected to PostgreSQL.");

        // 1. Enable the vector database extension
        await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
        console.log("✅ [Database Container]: pgvector extension enabled successfully.");

        // 2. Create table for codebase embeddings
        // NOTE: Gemini 2.5 embedding model creates vectors with exactly 768 dimensions
        await client.query(`
            CREATE TABLE IF NOT EXISTS codebase_chunks (
                id SERIAL PRIMARY KEY,
                file_path TEXT NOT NULL,
                content TEXT NOT NULL,
                embedding VECTOR(768) NOT NULL
            );
        `);
        console.log("📊 [Database Container]: 'codebase_chunks' table created.");

    } catch (error) {
        console.error("❌ [Database Container Setup Error]:", error);
    } finally {
        await client.end();
    }
}

initDB();
