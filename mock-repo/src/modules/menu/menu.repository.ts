import { db } from '../../database/db';


export interface MenuItemRecord {
    id: number;
    category_id: number;
    name: string;
    description: string | null;
    image_url: string | null;
    status: string;
    created_at: Date;
    updated_at: Date;
}


export async function createMenuItem(
    categoryId: number,
    name: string,
    description: string | null,
    imageUrl: string | null
): Promise<MenuItemRecord> {

    const result = await db.query<MenuItemRecord>(
        `
        INSERT INTO menu_items (
            category_id,
            name,
            description,
            image_url
        )
        VALUES ($1, $2, $3, $4)
        RETURNING
            id,
            category_id,
            name,
            description,
            image_url,
            status,
            created_at,
            updated_at
        `,
        [
            categoryId,
            name,
            description,
            imageUrl
        ]
    );

    return result.rows[0];
}


export async function findActiveMenuItems(): Promise<MenuItemRecord[]> {

    const result = await db.query<MenuItemRecord>(
        `
        SELECT
            id,
            category_id,
            name,
            description,
            image_url,
            status,
            created_at,
            updated_at
        FROM menu_items
        WHERE status = 'ACTIVE'
        ORDER BY name ASC
        `
    );

    return result.rows;
}

export async function findActiveMenuItemById(
    id: number
): Promise<MenuItemRecord | undefined> {

    const result = await db.query<MenuItemRecord>(
        `
        SELECT
            id,
            category_id,
            name,
            description,
            image_url,
            status,
            created_at,
            updated_at
        FROM menu_items
        WHERE id = $1
        AND status = 'ACTIVE'
        `,
        [id]
    );

    return result.rows[0];
}
