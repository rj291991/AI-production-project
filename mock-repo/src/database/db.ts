import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error(
        'DATABASE_URL is missing from environment variables.'
    );
}

export const db = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
});

db.on('error', (error) => {
    console.error(
        '❌ Unexpected PostgreSQL pool error:',
        error
    );
});

export async function checkDatabaseConnection(): Promise<void> {
    const result = await db.query(
        'SELECT NOW() AS current_time'
    );

    console.log(
        `✅ Database connected. PostgreSQL time: ${result.rows[0].current_time}`
    );
}
