import bcrypt from 'bcrypt';

import {
    findActiveCustomerByEmail
} from './auth.repository';

export interface LoginResult {
    id: string;
    name: string;
    email: string;
}

export async function login(email: string, password: string): Promise<LoginResult> {
    const customer = await findActiveCustomerByEmail(email);
    if (!customer) {
        throw new Error('Invalid email or password.');
    }
    const passwordMatches = await bcrypt.compare(password, customer.password_hash);
    if (!passwordMatches) {
        throw new Error('Invalid email or password.');
    }

    return {
        id: String(customer.id),
        name: customer.name,
        email: customer.email
    };
}