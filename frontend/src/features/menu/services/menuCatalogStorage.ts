import { createInitialMenuCatalog } from "../data/initialMenuCatalog";
import type { MenuCategory } from "../types";

const STORAGE_KEY = "restaurant-menu-catalog";
const STORAGE_EVENT = "restaurant-menu-catalog-change";

const SERVER_SNAPSHOT = createInitialMenuCatalog();

let cachedClientRaw: string | null | undefined;
let cachedClientSnapshot: MenuCategory[] | null = null;

function parseStoredCatalog(raw: string): MenuCategory[] {
  try {
    const parsed = JSON.parse(raw) as MenuCategory[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SERVER_SNAPSHOT;
  } catch {
    return SERVER_SNAPSHOT;
  }
}

function readCatalogFromStorage(): MenuCategory[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === cachedClientRaw && cachedClientSnapshot !== null) {
      return cachedClientSnapshot;
    }

    cachedClientRaw = raw;
    cachedClientSnapshot = raw ? parseStoredCatalog(raw) : SERVER_SNAPSHOT;
    return cachedClientSnapshot;
  } catch {
    cachedClientRaw = null;
    cachedClientSnapshot = SERVER_SNAPSHOT;
    return SERVER_SNAPSHOT;
  }
}

export function subscribeMenuCatalog(onStoreChange: () => void): () => void {
  const handler = (event: Event) => {
    if (event.type === "storage") {
      cachedClientRaw = undefined;
      cachedClientSnapshot = null;
    }
    onStoreChange();
  };

  window.addEventListener(STORAGE_EVENT, handler);
  window.addEventListener("storage", handler);

  return () => {
    window.removeEventListener(STORAGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function getMenuCatalogSnapshot(): MenuCategory[] {
  return readCatalogFromStorage();
}

export function getMenuCatalogServerSnapshot(): MenuCategory[] {
  return SERVER_SNAPSHOT;
}

export function persistMenuCatalog(categories: MenuCategory[]): void {
  const serialized = JSON.stringify(categories);
  localStorage.setItem(STORAGE_KEY, serialized);
  cachedClientRaw = serialized;
  cachedClientSnapshot = categories;
  window.dispatchEvent(new Event(STORAGE_EVENT));
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
