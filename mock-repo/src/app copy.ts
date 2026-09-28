import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { checkDatabaseConnection } from './database/db';
import restaurantRoutes from './modules/restaurant/restaurant.routes';
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/restaurants', restaurantRoutes);
app.get('/health', async (req: Request, res: Response): Promise<void> => {
    try {
        await checkDatabaseConnection();
        res.status(200).json({
            success: true,
            application: 'AgenticSprint Food Delivery',
            database: 'connected'
        });
    } catch (error) {
        console.error('❌ Health check failed:', error);
        res.status(503).json({
            success: false,
            application: 'AgenticSprint Food Delivery',
            database: 'disconnected'
        });
    }
})

const PORT = Number(process.env.PORT) || 8000;
app.listen(PORT, () => {
    console.log(`🚀 Application running on http://localhost:${PORT}`);
});