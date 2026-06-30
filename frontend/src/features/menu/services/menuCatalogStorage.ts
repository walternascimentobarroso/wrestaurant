import type { MenuCategory } from "../types";
import {
  countProductsByCategory,
  countProductsBySubcategory,
  getProductsSnapshot,
  renameCategoryInProductCache,
  renameSubcategoryInProductCache,
} from "./productStorage";
import { apiFetch } from "@/lib/api";
import {
  createOfflineStore,
  generateTempId,
  getItem,
  isOnline,
  isTempId,
  syncEngine,
  syncQueue,
} from "@/lib/offline";

import {
  applyCreateCategory,
  applyCreateSubcategory,
  applyDeleteCategory,
  applyDeleteSubcategory,
  applyUpdateCategory,
  applyUpdateSubcategory,
  findSubcategoryContext,
  replaceCategoryId,
  replaceSubcategoryId,
} from "./menuMutations";

const STORAGE_KEY = "menu-catalog";

const store = createOfflineStore<MenuCategory[]>({
  key: STORAGE_KEY,
  serverSnapshot: [],
  eventName: "restaurant-menu-catalog-change",
});

const tempIdMap = new Map<string, string>();

function enqueueAndFlush(
  mutation: Omit<
    Parameters<typeof syncQueue.enqueue>[0],
    "id" | "createdAt" | "retries"
  >,
): void {
  syncQueue.enqueue(mutation);
  void syncEngine.flush();
}

export function resolveCategoryId(categoryId: string): string {
  if (!isTempId(categoryId)) {
    return categoryId;
  }
  return tempIdMap.get(categoryId) ?? categoryId;
}

export function resolveSubcategoryId(subcategoryId: string): string {
  if (!isTempId(subcategoryId)) {
    return subcategoryId;
  }
  return tempIdMap.get(subcategoryId) ?? subcategoryId;
}

export function replaceTempCategoryId(oldId: string, newId: string): void {
  tempIdMap.set(oldId, newId);
  store.mutate((categories) => replaceCategoryId(categories, oldId, newId));
  syncQueue.remapEntityId("menuCatalog", oldId, newId);
  syncQueue.remapPayloadCategoryId(oldId, newId);
}

export function replaceTempSubcategoryId(oldId: string, newId: string): void {
  tempIdMap.set(oldId, newId);
  store.mutate((categories) => replaceSubcategoryId(categories, oldId, newId));
  syncQueue.remapEntityId("menuCatalog", oldId, newId);
}

export function replaceMenuCatalogFromServer(categories: MenuCategory[]): void {
  store.replace(categories);
}

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
    replaceMenuCatalogFromServer(categories);
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
  replaceMenuCatalogFromServer(categories);
  return categories;
}

export function persistMenuCatalog(_categories: MenuCategory[]): void {
  // Local cache is updated on writes; no-op for compatibility.
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

function findCategory(categoryId: string): MenuCategory | undefined {
  return store.getSnapshot().find((category) => category.id === categoryId);
}

function normalizeName(name: string): string {
  return name.trim();
}

function assertUniqueCategoryName(name: string, excludeId?: string): void {
  const normalized = normalizeName(name).toLowerCase();
  const conflict = store
    .getSnapshot()
    .some(
      (category) =>
        category.id !== excludeId && category.name.toLowerCase() === normalized,
    );
  if (conflict) {
    throw new Error("Já existe uma categoria com este nome.");
  }
}

function assertUniqueSubcategoryName(
  categoryId: string,
  name: string,
  excludeId?: string,
): void {
  const category = findCategory(categoryId);
  if (!category) {
    throw new Error("Categoria não encontrada.");
  }

  const normalized = normalizeName(name).toLowerCase();
  const conflict = category.subcategories.some(
    (subcategory) =>
      subcategory.id !== excludeId && subcategory.name.toLowerCase() === normalized,
  );
  if (conflict) {
    throw new Error("Subcategoria já existe.");
  }
}

export async function addCategoryApi(name: string): Promise<MenuCategory> {
  const normalizedName = normalizeName(name);
  assertUniqueCategoryName(normalizedName);

  const tempId = generateTempId();
  store.mutate((categories) => applyCreateCategory(categories, normalizedName, tempId));
  enqueueAndFlush({
    entity: "menuCatalog",
    operation: "createCategory",
    entityId: tempId,
    payload: { name: normalizedName },
  });

  const category = findCategory(tempId);
  if (!category) {
    throw new Error("Categoria não encontrada após criação local.");
  }
  return category;
}

export async function updateCategoryApi(id: string, name: string): Promise<MenuCategory> {
  const normalizedName = normalizeName(name);
  assertUniqueCategoryName(normalizedName, id);

  const current = findCategory(id);
  if (!current) {
    throw new Error("Categoria não encontrada.");
  }

  const oldName = current.name;
  store.mutate((categories) => applyUpdateCategory(categories, id, normalizedName));
  if (oldName !== normalizedName) {
    renameCategoryInProductCache(oldName, normalizedName);
  }

  if (isTempId(id)) {
    const pendingCreate = syncQueue.findPendingMutation("menuCatalog", id, "createCategory");
    if (pendingCreate) {
      syncQueue.updateMutationPayload(pendingCreate.id, { name: normalizedName });
    } else {
      enqueueAndFlush({
        entity: "menuCatalog",
        operation: "updateCategory",
        entityId: id,
        payload: { name: normalizedName },
      });
    }
  } else {
    enqueueAndFlush({
      entity: "menuCatalog",
      operation: "updateCategory",
      entityId: id,
      payload: { name: normalizedName },
    });
  }

  const category = findCategory(id);
  if (!category) {
    throw new Error("Categoria não encontrada.");
  }
  return category;
}

export async function deleteCategoryApi(id: string): Promise<void> {
  const category = findCategory(id);
  if (!category) {
    throw new Error("Categoria não encontrada.");
  }

  const productCount = countProductsByCategory(getProductsSnapshot(), category.name);
  if (productCount > 0) {
    throw new Error(
      `Não é possível excluir: ${productCount} produto(s) vinculado(s).`,
    );
  }

  store.mutate((categories) => applyDeleteCategory(categories, id));
  if (isTempId(id)) {
    syncQueue.removeMutationsForEntityId("menuCatalog", id);
    return;
  }
  enqueueAndFlush({
    entity: "menuCatalog",
    operation: "deleteCategory",
    entityId: id,
    payload: {},
  });
}

export async function addSubcategoryApi(
  categoryId: string,
  name: string,
): Promise<MenuCategory> {
  const normalizedName = normalizeName(name);
  assertUniqueSubcategoryName(categoryId, normalizedName);

  const tempId = generateTempId();
  store.mutate((categories) =>
    applyCreateSubcategory(categories, categoryId, normalizedName, tempId),
  );
  enqueueAndFlush({
    entity: "menuCatalog",
    operation: "createSubcategory",
    entityId: tempId,
    payload: { categoryId, name: normalizedName },
  });

  const category = findCategory(categoryId);
  if (!category) {
    throw new Error("Categoria não encontrada.");
  }
  return category;
}

export async function updateSubcategoryApi(id: string, name: string): Promise<MenuCategory> {
  const normalizedName = normalizeName(name);
  const categories = store.getSnapshot();
  const context = findSubcategoryContext(categories, id);
  if (!context) {
    throw new Error("Subcategoria não encontrada.");
  }

  const parentCategory = categories.find((category) =>
    category.subcategories.some((subcategory) => subcategory.id === id),
  );
  if (!parentCategory) {
    throw new Error("Categoria não encontrada.");
  }

  assertUniqueSubcategoryName(parentCategory.id, normalizedName, id);

  const oldName = context.subcategoryName;
  store.mutate((catalog) => applyUpdateSubcategory(catalog, id, normalizedName));
  if (oldName !== normalizedName) {
    renameSubcategoryInProductCache(context.categoryName, oldName, normalizedName);
  }

  if (isTempId(id)) {
    const pendingCreate = syncQueue.findPendingMutation(
      "menuCatalog",
      id,
      "createSubcategory",
    );
    if (pendingCreate) {
      syncQueue.updateMutationPayload(pendingCreate.id, {
        ...(pendingCreate.payload as Record<string, unknown>),
        name: normalizedName,
      });
    } else {
      enqueueAndFlush({
        entity: "menuCatalog",
        operation: "updateSubcategory",
        entityId: id,
        payload: { name: normalizedName },
      });
    }
  } else {
    enqueueAndFlush({
      entity: "menuCatalog",
      operation: "updateSubcategory",
      entityId: id,
      payload: { name: normalizedName },
    });
  }

  const updatedCategories = store.getSnapshot();
  const updatedCategory = updatedCategories.find((category) =>
    category.subcategories.some((subcategory) => subcategory.id === id),
  );
  if (!updatedCategory) {
    throw new Error("Categoria não encontrada.");
  }
  return updatedCategory;
}

export async function deleteSubcategoryApi(id: string): Promise<void> {
  const categories = store.getSnapshot();
  const context = findSubcategoryContext(categories, id);
  if (!context) {
    throw new Error("Subcategoria não encontrada.");
  }

  const productCount = countProductsBySubcategory(
    getProductsSnapshot(),
    context.categoryName,
    context.subcategoryName,
  );
  if (productCount > 0) {
    throw new Error(
      `Não é possível excluir: ${productCount} produto(s) vinculado(s).`,
    );
  }

  store.mutate((catalog) => applyDeleteSubcategory(catalog, id));
  if (isTempId(id)) {
    syncQueue.removeMutationsForEntityId("menuCatalog", id);
    return;
  }
  enqueueAndFlush({
    entity: "menuCatalog",
    operation: "deleteSubcategory",
    entityId: id,
    payload: {},
  });
}
