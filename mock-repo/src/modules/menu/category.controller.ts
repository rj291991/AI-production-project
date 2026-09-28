import {
    Request,
    Response
} from 'express';

import {
    getActiveCategories,
    addCategory
} from './category.service';


export async function listCategories(req: Request, res: Response): Promise<void> {
    try {
        const categories = await getActiveCategories();
        res.status(200).json({
            success: true,
            data: categories
        });
    } catch (error) {
        console.error('[Category Controller] List categories failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve categories.'
        });
    }
}


export async function createCategory(req: Request, res: Response): Promise<void> {
    try {
        const { name } = req.body;
        if (typeof name !== 'string') {
            res.status(400).json({
                success: false,
                error: 'Category name must be a string.'
            });
            return;
        }
        const category = await addCategory(name);
        res.status(201).json({
            success: true,
            data: category
        });
    } catch (error) {
        console.error('[Category Controller] Create category failed:', error);
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create category.'
        });
    }
}