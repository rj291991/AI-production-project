import {
    Request,
    Response
} from 'express';

import {
    getRestaurantById,
    getActiveRestaurants,
    registerRestaurant
} from './restaurant.service';

export async function getRestaurant(req: Request, res: Response): Promise<void> {
    try {
        const id = Number(req.params.id);
        const restaurant = await getRestaurantById(id);
        res.status(200).json({
            success: true,
            data: restaurant
        });
    } catch (error) {
        console.error('[Restaurant Controller] Get restaurant failed:', error);
        res.status(404).json({
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : 'Restaurant not found.'
        });
    }
}

export async function listRestaurants(req: Request, res: Response): Promise<void> {
    try {
        const restaurants = await getActiveRestaurants();
        res.status(200).json({
            success: true,
            data: restaurants
        });
    } catch (error) {
        console.error(
            '[Restaurant Controller] List restaurants failed:',
            error
        );
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve restaurants.'
        });
    }
}

export async function createRestaurant(
    req: Request,
    res: Response
): Promise<void> {

    try {

        const {
            name
        } = req.body;

        if (typeof name !== 'string') {

            res.status(400).json({
                success: false,
                error:
                    'Restaurant name must be a string.'
            });

            return;
        }

        const restaurant =
            await registerRestaurant(name);

        res.status(201).json({
            success: true,
            data: restaurant
        });

    } catch (error) {

        console.error(
            '[Restaurant Controller] Create restaurant failed:',
            error
        );

        res.status(400).json({
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : 'Failed to create restaurant.'
        });
    }
}
