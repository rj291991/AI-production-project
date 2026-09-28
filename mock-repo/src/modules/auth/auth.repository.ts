import { db } from "../../database/db";

export interface CustomerRecord {
    id: string;
    name: string;
    email: string;
    password_hash: string;
    status: string;
}

export async function findActiveCustomerByEmail(email: string): Promise<CustomerRecord | null> {
    const result = await db.query<CustomerRecord>(`SELECT id, name, email, password_hash, status FROM customers WHERE email = $1 AND status = 'ACTIVE' LIMIT 1`,
        [email])
    return result.rows[0] ?? null;
}