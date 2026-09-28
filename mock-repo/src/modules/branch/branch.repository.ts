import { db } from '../../database/db';


export interface BranchRecord {
    id: number;
    restaurant_id: number;
    name: string;
    address: string;
    phone: string | null;
    opening_time: string | null;
    closing_time: string | null;
    status: string;
    created_at: Date;
    updated_at: Date;
}


export async function createBranch(
    restaurantId: number,
    name: string,
    address: string,
    phone: string | null,
    openingTime: string | null,
    closingTime: string | null
): Promise<BranchRecord> {

    const result = await db.query<BranchRecord>(
        `
        INSERT INTO branches (
            restaurant_id,
            name,
            address,
            phone,
            opening_time,
            closing_time
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING
            id,
            restaurant_id,
            name,
            address,
            phone,
            opening_time,
            closing_time,
            status,
            created_at,
            updated_at
        `,
        [
            restaurantId,
            name,
            address,
            phone,
            openingTime,
            closingTime
        ]
    );

    return result.rows[0];
}


export async function findActiveBranches(): Promise<BranchRecord[]> {

    const result = await db.query<BranchRecord>(
        `
        SELECT
            id,
            restaurant_id,
            name,
            address,
            phone,
            opening_time,
            closing_time,
            status,
            created_at,
            updated_at
        FROM branches
        WHERE status = 'ACTIVE'
        ORDER BY name ASC
        `
    );

    return result.rows;
}


export async function findActiveBranchById(
    id: number
): Promise<BranchRecord | undefined> {

    const result = await db.query<BranchRecord>(
        `
        SELECT
            id,
            restaurant_id,
            name,
            address,
            phone,
            opening_time,
            closing_time,
            status,
            created_at,
            updated_at
        FROM branches
        WHERE id = $1
        AND status = 'ACTIVE'
        `,
        [id]
    );

    return result.rows[0];
}
