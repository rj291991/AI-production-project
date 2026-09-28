import express from 'express';
import dotenv from 'dotenv';
import { checkDatabaseConnection } from './database/db';
import restaurantRoutes from './modules/restaurant/restaurant.routes';
import authRoutes from './modules/auth/auth.routes';
import categoryRoutes from './modules/menu/category.routes';
import menuItemRoutes from './modules/menu/menu.routes';
import branchRoutes from './modules/branch/branch.routes';
import branchMenuItemRoutes from './modules/menu/branch-menu-item.routes';

dotenv.config();

const app = express();

app.use(express.json());
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/menu-items', menuItemRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/branch-menu-items', branchMenuItemRoutes);

app.get('/health', (_req, res) => {
    res.json({
        success: true,
        message: 'Food Delivery API is running'
    });
});

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
    console.log(`🚀 Food Delivery API running on port ${PORT}`);
});

export default app;