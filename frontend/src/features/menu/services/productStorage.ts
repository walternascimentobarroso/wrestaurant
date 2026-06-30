import type { Product } from "@/features/tables/types";
import { apiFetch } from "@/lib/api";
import { createOfflineStore, getItem, isOnline } from "@/lib/offline";

const STORAGE_KEY = "products";

const store = createOfflineStore<Product[]>({
  key: STORAGE_KEY,
  serverSnapshot: [],
  eventName: "restaurant-products-change",
});

export async function hydrateProductsIfEmpty(): Promise<void> {
  if (!isOnline()) {
    return;
  }

  const stored = getItem<Product[]>(STORAGE_KEY);
  if (stored !== null && stored.length > 0) {
    return;
  }

  try {
    const products = await apiFetch<Product[]>("/products");
    store.replace(products);
  } catch {
    // Keep empty cache until next successful hydrate.
  }
}

export const subscribeProducts = store.subscribe;
export const getProductsSnapshot = store.getSnapshot;
export const getProductsServerSnapshot = store.getServerSnapshot;
export const isProductsLoaded = store.isLoaded;

export async function refreshProducts(): Promise<Product[]> {
  if (!isOnline()) {
    return store.getSnapshot();
  }

  const products = await apiFetch<Product[]>("/products");
  store.replace(products);
  return products;
}

export function persistProducts(_products: Product[]): void {
  // Local cache is updated via mutate on writes; no-op for compatibility.
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

export async function createProductApi(body: Record<string, unknown>): Promise<Product> {
  const product = await apiFetch<Product>("/products", {
    method: "POST",
    body: JSON.stringify(body),
  });
  store.mutate((products) => [...products, product]);
  return product;
}

export async function updateProductApi(
  id: string,
  body: Record<string, unknown>,
): Promise<Product> {
  const product = await apiFetch<Product>(`/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  store.mutate((products) =>
    products.map((entry) => (entry.id === id ? product : entry)),
  );
  return product;
}

export async function deleteProductApi(id: string): Promise<void> {
  await apiFetch<void>(`/products/${id}`, { method: "DELETE" });
  store.mutate((products) => products.filter((entry) => entry.id !== id));
}
