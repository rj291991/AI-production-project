import {
    Request,
    Response
} from 'express';

import {
    getBranchMenuItems,
    registerBranchMenuItem
} from './branch-menu-item.service';


export async function listBranchMenuItems(
    req: Request,
    res: Response
): Promise<void> {

    try {

        const branchId = Number(req.params.branchId);

        const items = await getBranchMenuItems(branchId);

        res.status(200).json({
            success: true,
            data: items
        });

    } catch (error) {

        console.error(
            '[Branch Menu Item Controller] List failed:',
            error
        );

        const status =
            error instanceof Error &&
                error.message === 'Branch not found.'
                ? 404
                : 400;

        res.status(status).json({
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : 'Failed to retrieve branch menu items.'
        });
    }
}


export async function createBranchMenuItem(
    req: Request,
    res: Response
): Promise<void> {

    try {

        const {
            branchId,
            menuItemId,
            price
        } = req.body;


        if (
            !Number.isInteger(branchId) ||
            branchId <= 0
        ) {

            res.status(400).json({
                success: false,
                error:
                    'Branch ID must be a positive integer.'
            });

            return;
        }


        if (
            !Number.isInteger(menuItemId) ||
            menuItemId <= 0
        ) {

            res.status(400).json({
                success: false,
                error:
                    'Menu Item ID must be a positive integer.'
            });

            return;
        }


        if (
            typeof price !== 'number' ||
            !Number.isFinite(price) ||
            price < 0
        ) {

            res.status(400).json({
                success: false,
                error:
                    'Price must be a valid non-negative number.'
            });

            return;
        }


        const branchMenuItem =
            await registerBranchMenuItem(
                branchId,
                menuItemId,
                price
            );


        res.status(201).json({
            success: true,
            data: branchMenuItem
        });

    } catch (error) {

        console.error(
            '[Branch Menu Item Controller] Create failed:',
            error
        );

        res.status(400).json({
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : 'Failed to add menu item to branch.'
        });
    }
}
