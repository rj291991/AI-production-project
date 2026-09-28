import bcrypt from 'bcrypt';
import { db } from './db';

async function seedCustomer(): Promise<void> {

const email = 'test@example.com';
const password = 'Test@12345';

try {

    const passwordHash =
        await bcrypt.hash(password, 12);

    const result =
        await db.query(
            `
            INSERT INTO customers (
                name,
                email,
                phone,
                password_hash,
                status
            )
            VALUES ($1, $2, $3, $4, 'ACTIVE')
            RETURNING id, name, email, status
            `,
            [
                'Test Customer',
                email,
                '9999999999',
                passwordHash
            ]
        );

    console.log(
        '✅ Test customer created:',
        result.rows[0]
    );

    console.log(
        `📧 Email: ${email}`
    );

    console.log(
        `🔑 Test password: ${password}`
    );

} catch (error) {

    console.error(
        '❌ Customer seed failed:',
        error
    );

} finally {

    await db.end();
}


}

seedCustomer();