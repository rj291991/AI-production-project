import { Request, Response } from "express";
import { login } from './auth.service';


export async function loginController(req: Request, res: Response): Promise<void> {
    try {
        const { email, password } = req.body;
        if (typeof email !== 'string' ||
            typeof password !== 'string' ||
            !email.trim() ||
            !password
        ) {
            res.status(400).json({
                success: false,
                error: 'Email and password are required.'
            });
            return;
        }
        const customer = await login(email.trim(), password);
        res.status(200).json({
            success: true,
            customer
        });
    } catch (e) {
        const message = e instanceof Error ? e.message : 'Authentication failed.';
        res.status(401).json({
            success: false,
            error: message
        });
    }
}