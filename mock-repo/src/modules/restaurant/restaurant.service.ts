import {
    createRestaurant,
    findActiveRestaurants,
    findRestaurantById
} from './restaurant.repository';


export async function getRestaurantById(id: number) {

    if (!Number.isInteger(id) || id <= 0) {
        throw new Error(
            'Restaurant ID must be a positive integer.'
        );
    }
    const restaurant = await findRestaurantById(id)

    if (!restaurant) {
        throw new Error(
            'Restaurant not found.'
        );
    }

    return restaurant;
}

export async function getActiveRestaurants() {
    return findActiveRestaurants();
}

export async function registerRestaurant(name: string) {
    const normalizedName = name.trim();
    if (!normalizedName) {
        throw new Error(
            'Restaurant name is required.'
        );
    }

    if (normalizedName.length > 150) {
        throw new Error(
            'Restaurant name cannot exceed 150 characters.'
        );
    }

    return createRestaurant({
        name: normalizedName
    });
}