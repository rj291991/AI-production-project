import { db } from '../../database/db';


export interface BranchMenuItemRecord {
    id: number;
    branch_id: number;
    menu_item_id: number;
    price: number;
    is_available: boolean;
    created_at: Date;
    updated_at: Date;
}


export async function createBranchMenuItem(
    branchId: number,
    menuItemId: number,
    price: number
): Promise<BranchMenuItemRecord> {

    const result = await db.query<BranchMenuItemRecord>(
        `
        INSERT INTO branch_menu_items (
            branch_id,
            menu_item_id,
            price
        )
        VALUES ($1, $2, $3)
        RETURNING
            id,
            branch_id,
            menu_item_id,
            price,
            is_available,
            created_at,
            updated_at
        `,
        [
            branchId,
            menuItemId,
            price
        ]
    );

    return result.rows[0];
}


export async function findBranchMenuItems(
    branchId: number
): Promise<BranchMenuItemRecord[]> {

    const result = await db.query<BranchMenuItemRecord>(
        `
        SELECT
            id,
            branch_id,
            menu_item_id,
            price,
            is_available,
            created_at,
            updated_at
        FROM branch_menu_items
        WHERE branch_id = $1
        ORDER BY id ASC
        `,
        [branchId]
    );

    return result.rows;
}
