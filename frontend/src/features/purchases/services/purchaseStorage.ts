import { getProductsSnapshot, applyPurchaseToProductCache } from "@/features/menu/services/productStorage";
import { getSuppliersSnapshot } from "@/features/suppliers/services/supplierStorage";
import type { PurchaseInput, PurchaseRecord } from "../types";
import { apiFetch } from "@/lib/api";
import {
  createOfflineStore,
  generateTempId,
  indexedDbPersistence,
  initIndexedDbPersistence,
  isOnline,
  isTempId,
  syncEngine,
  syncQueue,
} from "@/lib/offline";

import {
  appendPurchase,
  buildPurchaseRecord,
  replacePurchaseId,
} from "./purchaseMutations";

const STORAGE_KEY = "purchases";

const store = createOfflineStore<PurchaseRecord[]>({
  key: STORAGE_KEY,
  serverSnapshot: [],
  eventName: "restaurant-purchase-history-change",
  persistence: indexedDbPersistence,
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

export function resolvePurchaseId(purchaseId: string): string {
  if (!isTempId(purchaseId)) {
    return purchaseId;
  }
  return tempIdMap.get(purchaseId) ?? purchaseId;
}

export function replaceTempPurchaseId(oldId: string, newId: string): void {
  tempIdMap.set(oldId, newId);
  store.mutate((records) => replacePurchaseId(records, oldId, newId));
  syncQueue.remapEntityId("purchases", oldId, newId);
}

export function replacePurchasesFromServer(records: PurchaseRecord[]): void {
  store.replace(
    [...records].sort(
      (a, b) =>
        new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime(),
    ),
  );
}

export async function hydratePurchasesIfEmpty(): Promise<void> {
  await initIndexedDbPersistence();

  if (!isOnline()) {
    return;
  }

  if (store.getSnapshot().length > 0) {
    return;
  }

  try {
    const records = await apiFetch<PurchaseRecord[]>("/purchases");
    replacePurchasesFromServer(records);
  } catch {
    // Keep local cache until next successful hydrate.
  }
}

export const subscribePurchases = store.subscribe;
export const getPurchasesSnapshot = store.getSnapshot;
export const getPurchasesServerSnapshot = store.getServerSnapshot;
export const isPurchasesLoaded = store.isLoaded;

export function persistPurchases(records: PurchaseRecord[]): void {
  void records;
  // Local cache is updated via mutate on writes; no-op for compatibility.
}

export function appendPurchaseRecord(record: PurchaseRecord): void {
  store.mutate((records) => appendPurchase(records, record));
}

function findPurchaseRecord(id: string): PurchaseRecord | undefined {
  return store.getSnapshot().find((record) => record.id === id);
}

export async function recordPurchaseApi(body: PurchaseInput): Promise<PurchaseRecord> {
  const product = getProductsSnapshot().find((entry) => entry.id === body.productId);
  const supplier = getSuppliersSnapshot().find((entry) => entry.id === body.supplierId);

  if (!product) {
    throw new Error("Produto não encontrado.");
  }

  if (!supplier) {
    throw new Error("Fornecedor não encontrado.");
  }

  const tempId = generateTempId();
  const record = buildPurchaseRecord(body, tempId, product, supplier);
  store.mutate((records) => appendPurchase(records, record));
  applyPurchaseToProductCache(
    body.productId,
    body.quantity,
    body.unitCost,
    body.supplierId,
  );
  enqueueAndFlush({
    entity: "purchases",
    operation: "create",
    entityId: tempId,
    payload: body,
  });

  const saved = findPurchaseRecord(tempId);
  if (!saved) {
    throw new Error("Compra não encontrada após registro local.");
  }
  return saved;
}
