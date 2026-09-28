import {
    Request,
    Response
} from 'express';

import {
    getBranchById,
    getActiveBranches,
    registerBranch
} from './branch.service';


export async function getBranch(
    req: Request,
    res: Response
): Promise<void> {

    try {

        const id = Number(req.params.id);

        const branch =
            await getBranchById(id);

        res.status(200).json({
            success: true,
            data: branch
        });

    } catch (error) {

        console.error(
            '[Branch Controller] Get branch failed:',
            error
        );

        res.status(404).json({
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : 'Branch not found.'
        });
    }
}


export async function listBranches(
    req: Request,
    res: Response
): Promise<void> {

    try {

        const branches =
            await getActiveBranches();

        res.status(200).json({
            success: true,
            data: branches
        });

    } catch (error) {

        console.error(
            '[Branch Controller] List branches failed:',
            error
        );

        res.status(500).json({
            success: false,
            error: 'Failed to retrieve branches.'
        });
    }
}


export async function createBranch(
    req: Request,
    res: Response
): Promise<void> {

    try {

        const {
            restaurantId,
            name,
            address,
            phone,
            openingTime,
            closingTime
        } = req.body;


        if (
            !Number.isInteger(restaurantId) ||
            restaurantId <= 0
        ) {

            res.status(400).json({
                success: false,
                error:
                    'Restaurant ID must be a positive integer.'
            });

            return;
        }


        if (typeof name !== 'string') {

            res.status(400).json({
                success: false,
                error:
                    'Branch name must be a string.'
            });

            return;
        }


        if (typeof address !== 'string') {

            res.status(400).json({
                success: false,
                error:
                    'Branch address must be a string.'
            });

            return;
        }


        if (
            phone !== undefined &&
            phone !== null &&
            typeof phone !== 'string'
        ) {

            res.status(400).json({
                success: false,
                error:
                    'Branch phone must be a string.'
            });

            return;
        }


        if (
            openingTime !== undefined &&
            openingTime !== null &&
            typeof openingTime !== 'string'
        ) {

            res.status(400).json({
                success: false,
                error:
                    'Opening time must be a string.'
            });

            return;
        }


        if (
            closingTime !== undefined &&
            closingTime !== null &&
            typeof closingTime !== 'string'
        ) {

            res.status(400).json({
                success: false,
                error:
                    'Closing time must be a string.'
            });

            return;
        }


        const branch =
            await registerBranch(
                restaurantId,
                name,
                address,
                phone ?? null,
                openingTime ?? null,
                closingTime ?? null
            );


        res.status(201).json({
            success: true,
            data: branch
        });

    } catch (error) {

        console.error(
            '[Branch Controller] Create branch failed:',
            error
        );

        res.status(400).json({
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : 'Failed to create branch.'
        });
    }
}
