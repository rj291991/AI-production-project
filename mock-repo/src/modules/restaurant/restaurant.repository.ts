import { db } from "../../database/db";

export interface Restaurant {
    id: number;
    name: string;
    status: 'ACTIVE | INACTIVE';
    created_at: Date;
    updated_at: Date;
}

export interface CreateRestaurantInput {
    name: string
}


export async function findRestaurantById(id: number): Promise<Restaurant | null> {
    // try {
    const result = await db.query<Restaurant>(`SELECT id,name,status,created_at,updated_at FROM restaurants WHERE id = $1`, [id])
    return result.rows[0] ?? null;
    // } catch (error) {
    //     console.log("errror inside =>", error)
    // }
}


export async function findActiveRestaurants(): Promise<Restaurant[]> {
    const result = await db.query<Restaurant>(
        `
        SELECT
            id,
            name,
            status,
            created_at,
            updated_at
        FROM restaurants
        WHERE status = 'ACTIVE'
        ORDER BY id ASC
        `
    );

    return result.rows;
}


export async function createRestaurant(input: CreateRestaurantInput): Promise<Restaurant> {
    const result = await db.query<Restaurant>(
        `
    INSERT INTO restaurants (name)
        VALUES ($1)
        RETURNING
            id,
            name,
            status,
            created_at,
            updated_at
        `,
        [input.name]

    )
    return result.rows[0];
}