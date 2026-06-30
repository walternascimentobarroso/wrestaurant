import type { MenuCategory } from "../types";
import { apiFetch } from "@/lib/api";
import { createOfflineStore, getItem, isOnline } from "@/lib/offline";

const STORAGE_KEY = "menu-catalog";

const store = createOfflineStore<MenuCategory[]>({
  key: STORAGE_KEY,
  serverSnapshot: [],
  eventName: "restaurant-menu-catalog-change",
});

export async function hydrateMenuCatalogIfEmpty(): Promise<void> {
  if (!isOnline()) {
    return;
  }

  const stored = getItem<MenuCategory[]>(STORAGE_KEY);
  if (stored !== null && stored.length > 0) {
    return;
  }

  try {
    const categories = await apiFetch<MenuCategory[]>("/menu/categories");
    store.replace(categories);
  } catch {
    // Keep empty cache until next successful hydrate.
  }
}

export const subscribeMenuCatalog = store.subscribe;
export const getMenuCatalogSnapshot = store.getSnapshot;
export const getMenuCatalogServerSnapshot = store.getServerSnapshot;

export async function refreshMenuCatalog(): Promise<MenuCategory[]> {
  if (!isOnline()) {
    return store.getSnapshot();
  }

  const categories = await apiFetch<MenuCategory[]>("/menu/categories");
  store.replace(categories);
  return categories;
}

export function persistMenuCatalog(_categories: MenuCategory[]): void {
  // Local cache is updated on writes in phase 2; no-op for compatibility.
}

export function getCategoryNames(categories: MenuCategory[]): string[] {
  return categories.map((category) => category.name);
}

export function getSubcategoryNames(
  categories: MenuCategory[],
  categoryName: string,
): string[] {
  const category = categories.find((entry) => entry.name === categoryName);
  return category?.subcategories.map((subcategory) => subcategory.name) ?? [];
}

export function findCategoryById(
  categories: MenuCategory[],
  categoryId: string,
): MenuCategory | undefined {
  return categories.find((category) => category.id === categoryId);
}

export function findSubcategoryById(
  category: MenuCategory,
  subcategoryId: string,
): MenuCategory["subcategories"][number] | undefined {
  return category.subcategories.find((subcategory) => subcategory.id === subcategoryId);
}

export async function addCategoryApi(name: string): Promise<MenuCategory> {
  const category = await apiFetch<MenuCategory>("/menu/categories", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  store.mutate((categories) => [...categories, category]);
  return category;
}

export async function updateCategoryApi(id: string, name: string): Promise<MenuCategory> {
  const category = await apiFetch<MenuCategory>(`/menu/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
  store.mutate((categories) =>
    categories.map((entry) => (entry.id === id ? category : entry)),
  );
  return category;
}

export async function deleteCategoryApi(id: string): Promise<void> {
  await apiFetch<void>(`/menu/categories/${id}`, { method: "DELETE" });
  store.mutate((categories) => categories.filter((entry) => entry.id !== id));
}

export async function addSubcategoryApi(
  categoryId: string,
  name: string,
): Promise<MenuCategory> {
  const category = await apiFetch<MenuCategory>(`/menu/categories/${categoryId}/subcategories`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  store.mutate((categories) =>
    categories.map((entry) => (entry.id === categoryId ? category : entry)),
  );
  return category;
}

export async function updateSubcategoryApi(id: string, name: string): Promise<MenuCategory> {
  const category = await apiFetch<MenuCategory>(`/menu/subcategories/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
  store.mutate((categories) =>
    categories.map((entry) => (entry.id === category.id ? category : entry)),
  );
  return category;
}

export async function deleteSubcategoryApi(id: string): Promise<void> {
  await apiFetch<void>(`/menu/subcategories/${id}`, { method: "DELETE" });
  await refreshMenuCatalog();
}
