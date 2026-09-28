import {
    Request,
    Response
} from 'express';

import {
    getActiveMenuItems,
    registerMenuItem
} from './menu.service';


export async function listMenuItems(
    req: Request,
    res: Response
): Promise<void> {

    try {

        const menuItems =
            await getActiveMenuItems();

        res.status(200).json({
            success: true,
            data: menuItems
        });

    } catch (error) {

        console.error(
            '[Menu Item Controller] List menu items failed:',
            error
        );

        res.status(500).json({
            success: false,
            error: 'Failed to retrieve menu items.'
        });
    }
}


export async function createMenuItem(
    req: Request,
    res: Response
): Promise<void> {

    try {

        const {
            categoryId,
            name,
            description,
            imageUrl
        } = req.body;


        if (
            !Number.isInteger(categoryId) ||
            categoryId <= 0
        ) {

            res.status(400).json({
                success: false,
                error:
                    'Category ID must be a positive integer.'
            });

            return;
        }


        if (typeof name !== 'string') {

            res.status(400).json({
                success: false,
                error:
                    'Menu item name must be a string.'
            });

            return;
        }


        if (
            description !== undefined &&
            description !== null &&
            typeof description !== 'string'
        ) {

            res.status(400).json({
                success: false,
                error:
                    'Description must be a string.'
            });

            return;
        }


        if (
            imageUrl !== undefined &&
            imageUrl !== null &&
            typeof imageUrl !== 'string'
        ) {

            res.status(400).json({
                success: false,
                error:
                    'Image URL must be a string.'
            });

            return;
        }


        const menuItem =
            await registerMenuItem(
                categoryId,
                name,
                description ?? null,
                imageUrl ?? null
            );


        res.status(201).json({
            success: true,
            data: menuItem
        });

    } catch (error) {

        console.error(
            '[Menu Item Controller] Create menu item failed:',
            error
        );

        res.status(400).json({
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : 'Failed to create menu item.'
        });
    }
}
