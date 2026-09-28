import { createCategory, findActiveCategories, CategoryRecord } from "./category.repository";


export async function addCategory(name: string): Promise<CategoryRecord> {
    const trimmedName = name.trim()
    if (!trimmedName) {
        throw new Error("Category name is required");
    }
    return createCategory(trimmedName)

}

export async function getActiveCategories(): Promise<CategoryRecord[]> {
    return findActiveCategories();
}
