import type { Product } from "@/features/tables/types";
import { apiFetch } from "@/lib/api";
import { createApiStore } from "@/lib/apiStore";

const store = createApiStore<Product[]>({
  fetchSnapshot: () => apiFetch<Product[]>("/products"),
  serverSnapshot: [],
  eventName: "restaurant-products-change",
});

export const subscribeProducts = store.subscribe;
export const getProductsSnapshot = store.getSnapshot;
export const getProductsServerSnapshot = store.getServerSnapshot;

export async function refreshProducts(): Promise<Product[]> {
  return store.refresh();
}

export function persistProducts(_products: Product[]): void {
  void store.refresh();
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
  await store.refresh();
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
  await store.refresh();
  return product;
}

export async function deleteProductApi(id: string): Promise<void> {
  await apiFetch<void>(`/products/${id}`, { method: "DELETE" });
  await store.refresh();
}
