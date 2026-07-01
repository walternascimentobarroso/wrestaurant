import { getTablesSnapshot, remapProductIdInTables } from "@/features/tables/services/tableStorage";
import type { Product } from "@/features/tables/types";
import { apiFetch } from "@/lib/api";
import {
  createOfflineStore,
  generateTempId,
  getItem,
  isOnline,
  isTempId,
  setItem,
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
const TEMP_ID_MAP_KEY = "product-temp-id-map";

const store = createOfflineStore<Product[]>({
  key: STORAGE_KEY,
  serverSnapshot: [],
  eventName: "restaurant-products-change",
});

function loadTempIdMap(): Map<string, string> {
  const map = new Map<string, string>();
  if (typeof window === "undefined") {
    return map;
  }

  const stored = getItem<Record<string, string>>(TEMP_ID_MAP_KEY);
  if (!stored) {
    return map;
  }

  for (const [oldId, newId] of Object.entries(stored)) {
    map.set(oldId, newId);
  }
  return map;
}

const tempIdMap = loadTempIdMap();

function persistTempIdMap(): void {
  if (typeof window === "undefined") {
    return;
  }
  setItem(TEMP_ID_MAP_KEY, Object.fromEntries(tempIdMap));
}

function repairTempIdReferences(): void {
  if (tempIdMap.size === 0) {
    return;
  }

  for (const [oldId, newId] of tempIdMap.entries()) {
    syncQueue.remapPayloadProductId(oldId, newId);
    remapProductIdInTables(oldId, newId);
  }

  if (!store.isLoaded()) {
    return;
  }

  store.mutate((products) => {
    let next = products;
    for (const [oldId, newId] of tempIdMap.entries()) {
      next = replaceProductId(next, oldId, newId);
    }
    return next;
  });
}

export function repairProductTempIdReferences(): void {
  repairTempIdReferences();
  repairPendingProductPayloadsFromCache();
}

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

  const fromMemory = tempIdMap.get(productId);
  if (fromMemory) {
    return fromMemory;
  }

  const stored = getItem<Record<string, string>>(TEMP_ID_MAP_KEY);
  const fromStorage = stored?.[productId];
  if (fromStorage) {
    tempIdMap.set(productId, fromStorage);
    return fromStorage;
  }

  return productId;
}

export function repairPendingProductPayloadsFromCache(): void {
  if (!store.isLoaded()) {
    return;
  }

  const products = store.getSnapshot();

  for (const mutation of syncQueue.getAll()) {
    if (mutation.entity !== "products") {
      continue;
    }

    if (mutation.operation !== "create" && mutation.operation !== "update") {
      continue;
    }

    const entityId = String(mutation.entityId);
    const local = products.find(
      (product) => product.id === entityId || product.id === resolveProductId(entityId),
    );
    if (!local) {
      continue;
    }

    const payload = mutation.payload as ProductCreateInput;
    const recipe = local.recipe?.map((line) => ({
      ingredientId: line.ingredientId,
      quantity: line.quantity,
      unit: line.unit,
    }));

    const nextPayload: ProductCreateInput = {
      ...payload,
      name: local.name,
      price: local.price,
      category: local.category,
      subcategory: local.subcategory,
      kind: local.kind,
      recipe,
      trackStock: local.trackStock,
      stockQuantity: local.stockQuantity,
      minStock: local.minStock,
      stockUnit: local.stockUnit ?? "un",
      packageSize: local.packageSize,
      packageUnit: local.packageUnit,
    };

    if (JSON.stringify(payload) === JSON.stringify(nextPayload)) {
      continue;
    }

    syncQueue.updateMutationPayload(mutation.id, nextPayload);
  }
}

export function replaceTempProductId(oldId: string, newId: string): void {
  tempIdMap.set(oldId, newId);
  persistTempIdMap();
  store.mutate((products) => replaceProductId(products, oldId, newId));
  syncQueue.remapEntityId("products", oldId, newId);
  syncQueue.remapPayloadProductId(oldId, newId);
  remapProductIdInTables(oldId, newId);
}

export function replaceProductsFromServer(products: Product[]): void {
  const pendingCreateIds = new Set(
    syncQueue
      .getAll()
      .filter((mutation) => mutation.entity === "products" && mutation.operation === "create")
      .map((mutation) => String(mutation.entityId)),
  );

  if (pendingCreateIds.size === 0) {
    store.replace(products);
    return;
  }

  const local = store.isLoaded() ? store.getSnapshot() : [];
  const pendingLocal = local.filter((product) => pendingCreateIds.has(product.id));
  const merged = new Map(products.map((product) => [product.id, product]));
  for (const product of pendingLocal) {
    merged.set(product.id, product);
  }
  store.replace([...merged.values()]);
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

export function persistProducts(products: Product[]): void {
  void products;
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

export async function createProductApi(body: ProductCreateInput): Promise<Product> {
  const tempId = generateTempId();
  store.mutate((products) => applyCreateProduct(products, body, tempId));
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
  body: ProductUpdateInput,
): Promise<Product> {
  store.mutate((products) => applyUpdateProduct(products, id, body));

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
