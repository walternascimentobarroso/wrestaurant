import type { MenuCategory } from "../types";
import { apiFetch } from "@/lib/api";
import { createApiStore } from "@/lib/apiStore";

const store = createApiStore<MenuCategory[]>({
  fetchSnapshot: () => apiFetch<MenuCategory[]>("/menu/categories"),
  serverSnapshot: [],
  eventName: "restaurant-menu-catalog-change",
});

export const subscribeMenuCatalog = store.subscribe;
export const getMenuCatalogSnapshot = store.getSnapshot;
export const getMenuCatalogServerSnapshot = store.getServerSnapshot;

export async function refreshMenuCatalog(): Promise<MenuCategory[]> {
  return store.refresh();
}

export function persistMenuCatalog(_categories: MenuCategory[]): void {
  void store.refresh();
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
  await store.refresh();
  return category;
}

export async function updateCategoryApi(id: string, name: string): Promise<MenuCategory> {
  const category = await apiFetch<MenuCategory>(`/menu/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
  await store.refresh();
  return category;
}

export async function deleteCategoryApi(id: string): Promise<void> {
  await apiFetch<void>(`/menu/categories/${id}`, { method: "DELETE" });
  await store.refresh();
}

export async function addSubcategoryApi(
  categoryId: string,
  name: string,
): Promise<MenuCategory> {
  const category = await apiFetch<MenuCategory>(`/menu/categories/${categoryId}/subcategories`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  await store.refresh();
  return category;
}

export async function updateSubcategoryApi(id: string, name: string): Promise<MenuCategory> {
  const category = await apiFetch<MenuCategory>(`/menu/subcategories/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
  await store.refresh();
  return category;
}

export async function deleteSubcategoryApi(id: string): Promise<void> {
  await apiFetch<void>(`/menu/subcategories/${id}`, { method: "DELETE" });
  await store.refresh();
}
