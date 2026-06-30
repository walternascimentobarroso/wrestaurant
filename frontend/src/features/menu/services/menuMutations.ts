import type { MenuCategory } from "../types";

export function applyCreateCategory(
  categories: MenuCategory[],
  name: string,
  tempId: string,
): MenuCategory[] {
  return [...categories, { id: tempId, name, subcategories: [] }];
}

export function applyUpdateCategory(
  categories: MenuCategory[],
  categoryId: string,
  name: string,
): MenuCategory[] {
  return categories.map((category) =>
    category.id === categoryId ? { ...category, name } : category,
  );
}

export function applyDeleteCategory(
  categories: MenuCategory[],
  categoryId: string,
): MenuCategory[] {
  return categories.filter((category) => category.id !== categoryId);
}

export function applyCreateSubcategory(
  categories: MenuCategory[],
  categoryId: string,
  name: string,
  tempId: string,
): MenuCategory[] {
  return categories.map((category) =>
    category.id === categoryId
      ? {
          ...category,
          subcategories: [...category.subcategories, { id: tempId, name }],
        }
      : category,
  );
}

export function applyUpdateSubcategory(
  categories: MenuCategory[],
  subcategoryId: string,
  name: string,
): MenuCategory[] {
  return categories.map((category) => ({
    ...category,
    subcategories: category.subcategories.map((subcategory) =>
      subcategory.id === subcategoryId ? { ...subcategory, name } : subcategory,
    ),
  }));
}

export function applyDeleteSubcategory(
  categories: MenuCategory[],
  subcategoryId: string,
): MenuCategory[] {
  return categories.map((category) => ({
    ...category,
    subcategories: category.subcategories.filter(
      (subcategory) => subcategory.id !== subcategoryId,
    ),
  }));
}

export function replaceCategoryId(
  categories: MenuCategory[],
  oldId: string,
  newId: string,
): MenuCategory[] {
  return categories.map((category) =>
    category.id === oldId ? { ...category, id: newId } : category,
  );
}

export function replaceSubcategoryId(
  categories: MenuCategory[],
  oldId: string,
  newId: string,
): MenuCategory[] {
  return categories.map((category) => ({
    ...category,
    subcategories: category.subcategories.map((subcategory) =>
      subcategory.id === oldId ? { ...subcategory, id: newId } : subcategory,
    ),
  }));
}

export function findCategoryName(
  categories: MenuCategory[],
  categoryId: string,
): string | undefined {
  return categories.find((category) => category.id === categoryId)?.name;
}

export function findSubcategoryContext(
  categories: MenuCategory[],
  subcategoryId: string,
): { categoryName: string; subcategoryName: string } | undefined {
  for (const category of categories) {
    const subcategory = category.subcategories.find(
      (entry) => entry.id === subcategoryId,
    );
    if (subcategory) {
      return {
        categoryName: category.name,
        subcategoryName: subcategory.name,
      };
    }
  }
  return undefined;
}
