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

import type { Sale, SaleFormInput } from "../types";
import {
  applyCreateSale,
  applyDeleteSale,
  applyUpdateSale,
  appendSale,
  replaceSaleId,
} from "./saleMutations";
import { toApiSalePayload } from "./saleService";

const STORAGE_KEY = "sales";

const store = createOfflineStore<Sale[]>({
  key: STORAGE_KEY,
  serverSnapshot: [],
  eventName: "restaurant-sales-change",
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

export function resolveSaleId(saleId: string): string {
  if (!isTempId(saleId)) {
    return saleId;
  }
  return tempIdMap.get(saleId) ?? saleId;
}

export function replaceTempSaleId(oldId: string, newId: string): void {
  tempIdMap.set(oldId, newId);
  store.mutate((sales) => replaceSaleId(sales, oldId, newId));
  syncQueue.remapEntityId("sales", oldId, newId);
}

export function replaceSalesFromServer(sales: Sale[]): void {
  store.replace(
    [...sales].sort(
      (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
    ),
  );
}

export async function hydrateSalesIfEmpty(): Promise<void> {
  await initIndexedDbPersistence();

  if (!isOnline()) {
    return;
  }

  if (store.getSnapshot().length > 0) {
    return;
  }

  try {
    const sales = await apiFetch<Sale[]>("/sales");
    replaceSalesFromServer(sales);
  } catch {
    // Keep local cache until next successful hydrate.
  }
}

export const subscribeSales = store.subscribe;
export const getSalesSnapshot = store.getSnapshot;
export const getSalesServerSnapshot = store.getServerSnapshot;
export const isSalesLoaded = store.isLoaded;

export function persistSales(sales: Sale[]): void {
  void sales;
  // Local cache is updated via mutate on writes; no-op for compatibility.
}

export function ensureWeeklyDemoSales(): void {
  // Demo data is seeded on the backend when empty.
}

function findSale(id: string): Sale | undefined {
  return store.getSnapshot().find((sale) => sale.id === id);
}

export function recordSale(sale: Sale): void {
  store.mutate((sales) => appendSale(sales, sale));
}

export function replaceLocalSaleId(oldId: string, newId: string): void {
  store.mutate((sales) => replaceSaleId(sales, oldId, newId));
}

export async function createSaleApi(
  input: SaleFormInput,
  products: Parameters<typeof applyCreateSale>[2],
): Promise<Sale> {
  const tempId = generateTempId();
  store.mutate((sales) => applyCreateSale(sales, input, products, tempId));
  enqueueAndFlush({
    entity: "sales",
    operation: "create",
    entityId: tempId,
    payload: toApiSalePayload(input),
  });

  const sale = findSale(tempId);
  if (!sale) {
    throw new Error("Venda não encontrada após criação local.");
  }
  return sale;
}

export async function updateSaleApi(
  id: string,
  input: SaleFormInput,
  products: Parameters<typeof applyUpdateSale>[3],
): Promise<Sale> {
  store.mutate((sales) => applyUpdateSale(sales, id, input, products));

  const payload = toApiSalePayload(input);

  if (isTempId(id)) {
    const pendingCreate = syncQueue.findPendingMutation("sales", id, "create");
    if (pendingCreate) {
      syncQueue.updateMutationPayload(pendingCreate.id, payload);
    } else {
      enqueueAndFlush({
        entity: "sales",
        operation: "update",
        entityId: id,
        payload,
      });
    }
  } else {
    enqueueAndFlush({
      entity: "sales",
      operation: "update",
      entityId: id,
      payload,
    });
  }

  const sale = findSale(id);
  if (!sale) {
    throw new Error("Venda não encontrada.");
  }
  return sale;
}

export async function deleteSaleApi(id: string, reason: string): Promise<void> {
  store.mutate((sales) => applyDeleteSale(sales, id));

  if (isTempId(id)) {
    syncQueue.removeMutationsForEntityId("sales", id);
    return;
  }

  enqueueAndFlush({
    entity: "sales",
    operation: "delete",
    entityId: id,
    payload: { reason: reason.trim() },
  });
}

export function isSameLocalDay(isoDate: string, reference = new Date()): boolean {
  const date = new Date(isoDate);
  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate()
  );
}

export function getTodaySales(reference = new Date()): Sale[] {
  return getSalesSnapshot()
    .filter((sale) => isSameLocalDay(sale.paidAt, reference))
    .sort(
      (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
    );
}
