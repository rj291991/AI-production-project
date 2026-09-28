import {
    createMenuItem,
    findActiveMenuItems
} from './menu.repository';

import {
    findActiveCategoryById
} from '../menu/category.repository';


export async function getActiveMenuItems() {
    return findActiveMenuItems();
}


export async function registerMenuItem(
    categoryId: number,
    name: string,
    description: string | null,
    imageUrl: string | null
) {

    if (!Number.isInteger(categoryId) || categoryId <= 0) {
        throw new Error(
            'Category ID must be a positive integer.'
        );
    }


    const category =
        await findActiveCategoryById(categoryId);

    if (!category) {
        throw new Error(
            'Category not found.'
        );
    }


    const normalizedName = name.trim();

    if (!normalizedName) {
        throw new Error(
            'Menu item name is required.'
        );
    }


    if (normalizedName.length > 150) {
        throw new Error(
            'Menu item name cannot exceed 150 characters.'
        );
    }


    const normalizedDescription = typeof description === 'string'
        ? description.trim() || null
        : null;


    const normalizedImageUrl = typeof imageUrl === 'string'
        ? imageUrl.trim() || null
        : null;


    return createMenuItem(
        categoryId,
        normalizedName,
        normalizedDescription,
        normalizedImageUrl
    );
}