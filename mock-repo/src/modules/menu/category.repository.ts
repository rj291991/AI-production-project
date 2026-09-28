import { db } from "../../database/db";


export interface CategoryRecord {
    id: number;
    name: string;
    status: string;
    created_at: Date;
    updated_at: Date;
}


export async function createCategory(name: string): Promise<CategoryRecord> {

    const result = await db.query<CategoryRecord>(
        `INSERT INTO categories (name) 
        VALUES ($1)
        RETURNING
        id,
        name,
        status,
        created_at,
        updated_at
        `,
        [name]
    )
    return result?.rows[0];
}


export async function findActiveCategories(): Promise<CategoryRecord[]> {

    const result = await db.query<CategoryRecord>(
        `
    SELECT
        id,
        name,
        status,
        created_at,
        updated_at
    FROM categories
    WHERE status = 'ACTIVE'
    ORDER BY name ASC
    `
    );

    return result.rows;
}

export async function findActiveCategoryById(
    id: number
): Promise<CategoryRecord | undefined> {

    const result = await db.query<CategoryRecord>(
        `
        SELECT
            id,
            name,
            status,
            created_at,
            updated_at
        FROM categories
        WHERE id = $1
        AND status = 'ACTIVE'
        `,
        [id]
    );

    return result.rows[0];
}
