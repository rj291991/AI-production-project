import { db } from './db';
async function testDatabaseConnection() {
    try {
        const result = await db.query('Select NOW()');
        console.log('✅ Database connected successfully');
        console.log('🕒 Database time:', result.rows[0].now);
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        process.exitCode = 1;
    } finally {
        await db.end();
    }

}

testDatabaseConnection()