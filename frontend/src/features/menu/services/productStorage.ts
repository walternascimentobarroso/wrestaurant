import { getTablesSnapshot, remapProductIdInTables } from "@/features/tables/services/tableStorage";
import type { Product } from "@/features/tables/types";
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
  applyCreateProduct,
  applyDeleteProduct,
  applyUpdateProduct,
  replaceProductId,
  type ProductCreateInput,
  type ProductUpdateInput,
} from "./productMutations";
import { applyPurchaseToProduct } from "@/features/purchases/services/purchaseMutations";

const STORAGE_KEY = "products";

const store = createOfflineStore<Product[]>({
  key: STORAGE_KEY,
  serverSnapshot: [],
  eventName: "restaurant-products-change",
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

export function resolveProductId(productId: string): string {
  if (!isTempId(productId)) {
    return productId;
  }
  return tempIdMap.get(productId) ?? productId;
}

export function replaceTempProductId(oldId: string, newId: string): void {
  tempIdMap.set(oldId, newId);
  store.mutate((products) => replaceProductId(products, oldId, newId));
  syncQueue.remapEntityId("products", oldId, newId);
  syncQueue.remapPayloadProductId(oldId, newId);
  remapProductIdInTables(oldId, newId);
}

export function replaceProductsFromServer(products: Product[]): void {
  store.replace(products);
}

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
    replaceProductsFromServer(products);
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
  replaceProductsFromServer(products);
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

export function renameCategoryInProductCache(oldName: string, newName: string): void {
  store.mutate((products) => renameCategoryInProducts(products, oldName, newName));
}

export function renameSubcategoryInProductCache(
  categoryName: string,
  oldName: string,
  newName: string,
): void {
  store.mutate((products) =>
    renameSubcategoryInProducts(products, categoryName, oldName, newName),
  );
}

export function applyPurchaseToProductCache(
  productId: string,
  quantity: number,
  unitCost: number,
  supplierId: string,
): void {
  store.mutate((products) =>
    applyPurchaseToProduct(products, productId, quantity, unitCost, supplierId),
  );
}

export function applyStockDeltaToProductCache(productId: string, delta: number): void {
  store.mutate((products) =>
    products.map((product) =>
      product.id === productId
        ? { ...product, stockQuantity: product.stockQuantity + delta }
        : product,
    ),
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

function isProductInActiveOrders(productId: string): boolean {
  return getTablesSnapshot().some((table) =>
    table.items.some((item) => item.productId === productId),
  );
}

function findProduct(productId: string): Product | undefined {
  return store.getSnapshot().find((product) => product.id === productId);
}

export async function createProductApi(body: Record<string, unknown>): Promise<Product> {
  const input = body as ProductCreateInput;
  const tempId = generateTempId();
  store.mutate((products) => applyCreateProduct(products, input, tempId));
  enqueueAndFlush({
    entity: "products",
    operation: "create",
    entityId: tempId,
    payload: body,
  });
  const product = findProduct(tempId);
  if (!product) {
    throw new Error("Produto não encontrado após criação local.");
  }
  return product;
}

export async function updateProductApi(
  id: string,
  body: Record<string, unknown>,
): Promise<Product> {
  const input = body as ProductUpdateInput;
  store.mutate((products) => applyUpdateProduct(products, id, input));

  if (isTempId(id)) {
    const pendingCreate = syncQueue.findPendingMutation("products", id, "create");
    if (pendingCreate) {
      syncQueue.updateMutationPayload(pendingCreate.id, {
        ...(pendingCreate.payload as Record<string, unknown>),
        ...body,
      });
    } else {
      enqueueAndFlush({
        entity: "products",
        operation: "update",
        entityId: id,
        payload: body,
      });
    }
  } else {
    enqueueAndFlush({
      entity: "products",
      operation: "update",
      entityId: id,
      payload: body,
    });
  }

  const product = findProduct(id);
  if (!product) {
    throw new Error("Produto não encontrado.");
  }
  return product;
}

export async function deleteProductApi(id: string): Promise<void> {
  if (isProductInActiveOrders(id)) {
    throw new Error("Não é possível excluir: produto está em um pedido aberto.");
  }

  store.mutate((products) => applyDeleteProduct(products, id));
  if (isTempId(id)) {
    syncQueue.removeMutationsForEntityId("products", id);
    return;
  }
  enqueueAndFlush({
    entity: "products",
    operation: "delete",
    entityId: id,
    payload: {},
  });
}
