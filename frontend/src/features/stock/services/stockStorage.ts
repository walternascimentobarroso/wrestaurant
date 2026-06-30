import { applyStockDeltaToProductCache, getProductsSnapshot } from "@/features/menu/services/productStorage";
import { apiFetch } from "@/lib/api";
import {
  createOfflineStore,
  indexedDbPersistence,
  initIndexedDbPersistence,
  isOnline,
  syncEngine,
  syncQueue,
} from "@/lib/offline";

import type { StockMovement } from "../types";
import {
  appendMovements,
  applyStockAdjustment,
  buildStockMovement,
  filterMovementsByProduct,
} from "./stockMutations";

const STORAGE_KEY = "stock-movements";

const store = createOfflineStore<StockMovement[]>({
  key: STORAGE_KEY,
  serverSnapshot: [],
  eventName: "restaurant-stock-movements-change",
  persistence: indexedDbPersistence,
});

function enqueueAndFlush(
  mutation: Omit<
    Parameters<typeof syncQueue.enqueue>[0],
    "id" | "createdAt" | "retries"
  >,
): void {
  syncQueue.enqueue(mutation);
  void syncEngine.flush();
}

export function replaceStockMovementsFromServer(movements: StockMovement[]): void {
  store.replace(
    [...movements].sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    ),
  );
}

export async function hydrateStockMovementsIfEmpty(): Promise<void> {
  await initIndexedDbPersistence();

  if (!isOnline()) {
    return;
  }

  if (store.getSnapshot().length > 0) {
    return;
  }

  try {
    const movements = await apiFetch<StockMovement[]>("/stock/movements");
    replaceStockMovementsFromServer(movements);
  } catch {
    // Keep local cache until next successful hydrate.
  }
}

export const subscribeStockMovements = store.subscribe;
export const getStockMovementsSnapshot = store.getSnapshot;
export const getStockMovementsServerSnapshot = store.getServerSnapshot;
export const isStockMovementsLoaded = store.isLoaded;

export { filterMovementsByProduct };

export function persistStockMovements(_movements: StockMovement[]): void {
  // Local cache is updated via mutate on writes; no-op for compatibility.
}

export function appendStockMovements(entries: StockMovement[]): void {
  if (entries.length === 0) {
    return;
  }

  store.mutate((movements) => appendMovements(movements, entries));
}

export async function adjustStockApi(body: {
  productId: string;
  delta: number;
  type: string;
  reason: string;
}): Promise<StockMovement> {
  if (body.delta === 0) {
    throw new Error("Informe uma quantidade válida diferente de zero.");
  }

  const normalizedReason = body.reason.trim();
  if (!normalizedReason) {
    throw new Error("Informe o motivo do ajuste.");
  }

  const product = getProductsSnapshot().find((entry) => entry.id === body.productId);
  if (!product) {
    throw new Error("Produto não encontrado.");
  }

  const quantityAfter = product.stockQuantity + body.delta;
  if (quantityAfter < 0) {
    throw new Error("O estoque não pode ficar negativo.");
  }

  const movement = buildStockMovement(
    product,
    body.type as StockMovement["type"],
    body.delta,
    quantityAfter,
    { reason: normalizedReason },
  );

  store.mutate((movements) => appendMovements(movements, [movement]));
  applyStockDeltaToProductCache(body.productId, body.delta);

  enqueueAndFlush({
    entity: "stock",
    operation: "adjust",
    entityId: body.productId,
    payload: body,
  });

  return movement;
}

export function applyLocalStockAdjustment(
  productId: string,
  delta: number,
  products: import("@/features/tables/types").Product[],
): import("@/features/tables/types").Product[] {
  return applyStockAdjustment(products, productId, delta);
}
