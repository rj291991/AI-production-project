import {
    createBranchMenuItem,
    findBranchMenuItems
} from './branch-menu-item.repository';

import {
    findActiveBranchById
} from '../branch/branch.repository';

import {
    findActiveMenuItemById
} from './menu.repository';


export async function getBranchMenuItems(
    branchId: number
) {

    if (
        !Number.isInteger(branchId) ||
        branchId <= 0
    ) {
        throw new Error(
            'Branch ID must be a positive integer.'
        );
    }

    const branch =
        await findActiveBranchById(branchId);

    if (!branch) {
        throw new Error(
            'Branch not found.'
        );
    }

    return findBranchMenuItems(branchId);
}


export async function registerBranchMenuItem(
    branchId: number,
    menuItemId: number,
    price: number
) {

    if (
        !Number.isInteger(branchId) ||
        branchId <= 0
    ) {
        throw new Error(
            'Branch ID must be a positive integer.'
        );
    }


    const branch =
        await findActiveBranchById(branchId);

    if (!branch) {
        throw new Error(
            'Branch not found.'
        );
    }


    if (
        !Number.isInteger(menuItemId) ||
        menuItemId <= 0
    ) {
        throw new Error(
            'Menu Item ID must be a positive integer.'
        );
    }


    const menuItem =
        await findActiveMenuItemById(menuItemId);

    if (!menuItem) {
        throw new Error(
            'Menu item not found.'
        );
    }


    if (
        typeof price !== 'number' ||
        !Number.isFinite(price) ||
        price < 0
    ) {
        throw new Error(
            'Price must be a valid non-negative number.'
        );
    }


    return createBranchMenuItem(
        branchId,
        menuItemId,
        price
    );
}
