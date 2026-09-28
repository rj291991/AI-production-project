import {
    createBranch,
    findActiveBranches,
    findActiveBranchById
} from './branch.repository';

import {
    findRestaurantById
} from '../restaurant/restaurant.repository';


export async function getBranchById(id: number) {

    if (!Number.isInteger(id) || id <= 0) {
        throw new Error(
            'Branch ID must be a positive integer.'
        );
    }

    const branch = await findActiveBranchById(id);

    if (!branch) {
        throw new Error(
            'Branch not found.'
        );
    }

    return branch;
}


export async function getActiveBranches() {

    return findActiveBranches();
}


export async function registerBranch(
    restaurantId: number,
    name: string,
    address: string,
    phone: string | null,
    openingTime: string | null,
    closingTime: string | null
) {

    if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
        throw new Error('Restaurant ID must be a positive integer.');
    }

    const restaurant = await findRestaurantById(restaurantId);

    if (!restaurant) {
        throw new Error('Restaurant not found.');
    }

    const normalizedName = name.trim();

    if (!normalizedName) {
        throw new Error(
            'Branch name is required.'
        );
    }

    if (normalizedName.length > 150) {
        throw new Error(
            'Branch name cannot exceed 150 characters.'
        );
    }

    const normalizedAddress = address.trim();

    if (!normalizedAddress) {
        throw new Error(
            'Branch address is required.'
        );
    }

    return createBranch(
        restaurantId,
        normalizedName,
        normalizedAddress,
        phone,
        openingTime,
        closingTime
    );
}