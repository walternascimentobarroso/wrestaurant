import { FAKE_PRODUCTS } from "@/features/tables/data/fakeProducts";
import type { Product } from "@/features/tables/types";

const STORAGE_KEY = "restaurant-products";
const STORAGE_EVENT = "restaurant-products-change";

const SERVER_SNAPSHOT = FAKE_PRODUCTS;

let cachedClientRaw: string | null | undefined;
let cachedClientSnapshot: Product[] | null = null;

function parseStoredProducts(raw: string): Product[] {
  try {
    const parsed = JSON.parse(raw) as Product[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SERVER_SNAPSHOT;
  } catch {
    return SERVER_SNAPSHOT;
  }
}

function readProductsFromStorage(): Product[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === cachedClientRaw && cachedClientSnapshot !== null) {
      return cachedClientSnapshot;
    }

    cachedClientRaw = raw;
    cachedClientSnapshot = raw ? parseStoredProducts(raw) : SERVER_SNAPSHOT;
    return cachedClientSnapshot;
  } catch {
    cachedClientRaw = null;
    cachedClientSnapshot = SERVER_SNAPSHOT;
    return SERVER_SNAPSHOT;
  }
}

export function subscribeProducts(onStoreChange: () => void): () => void {
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

export function getProductsSnapshot(): Product[] {
  return readProductsFromStorage();
}

export function getProductsServerSnapshot(): Product[] {
  return SERVER_SNAPSHOT;
}

export function persistProducts(products: Product[]): void {
  const serialized = JSON.stringify(products);
  localStorage.setItem(STORAGE_KEY, serialized);
  cachedClientRaw = serialized;
  cachedClientSnapshot = products;
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function countProductsByCategory(products: Product[], categoryName: string): number {
  return products.filter((product) => product.category === categoryName).length;
}

export function countProductsBySubcategory(
  products: Product[],
  categoryName: string,
  subcategoryName: string,
): number {
  return products.filter(
    (product) =>
      product.category === categoryName && product.subcategory === subcategoryName,
  ).length;
}

export function renameCategoryInProducts(
  products: Product[],
  oldName: string,
  newName: string,
): Product[] {
  return products.map((product) =>
    product.category === oldName ? { ...product, category: newName } : product,
  );
}

export function renameSubcategoryInProducts(
  products: Product[],
  categoryName: string,
  oldName: string,
  newName: string,
): Product[] {
  return products.map((product) =>
    product.category === categoryName && product.subcategory === oldName
      ? { ...product, subcategory: newName }
      : product,
  );
}

export function getProductsByCategoryAndSubcategory(
  products: Product[],
  category: string,
  subcategory: string,
): Product[] {
  return products.filter(
    (product) => product.category === category && product.subcategory === subcategory,
  );
}
