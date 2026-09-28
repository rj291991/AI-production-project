import test from 'node:test';
import assert from 'node:assert/strict';

process.env.DATABASE_URL ??= 'postgres://localhost:5432/testdb';

test('createBranch binds closing_time as the sixth SQL parameter', async (t) => {
    const { db } = await import('../../database/db');
    const { createBranch } = await import('./branch.repository');

    let capturedSql = '';
    let capturedParams: unknown[] = [];

    t.mock.method(db, 'query', async (sql: string, params?: unknown[]) => {
        capturedSql = sql;
        capturedParams = params ?? [];

        return {
            rows: [
                {
                    id: 1,
                    restaurant_id: 9,
                    name: 'Main',
                    address: '1 St',
                    phone: null,
                    opening_time: '09:00',
                    closing_time: '22:00',
                    status: 'ACTIVE',
                    created_at: new Date(),
                    updated_at: new Date()
                }
            ]
        };
    });

    const branch = await createBranch(
        9,
        'Main',
        '1 St',
        null,
        '09:00',
        '22:00'
    );

    assert.match(
        capturedSql,
        /VALUES\s*\(\$1,\s*\$2,\s*\$3,\s*\$4,\s*\$5,\s*\$6\)/
    );
    assert.doesNotMatch(capturedSql, /\$7/);
    assert.deepEqual(capturedParams, [
        9,
        'Main',
        '1 St',
        null,
        '09:00',
        '22:00'
    ]);
    assert.equal(branch.closing_time, '22:00');

    await db.end();
});
