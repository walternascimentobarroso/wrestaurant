import { apiFetch } from "@/lib/api";
import {
  createOfflineStore,
  indexedDbPersistence,
  initIndexedDbPersistence,
  isOnline,
} from "@/lib/offline";

import type { Sale } from "../types";
import { appendSale, replaceSaleId } from "./saleMutations";

const STORAGE_KEY = "sales";

const store = createOfflineStore<Sale[]>({
  key: STORAGE_KEY,
  serverSnapshot: [],
  eventName: "restaurant-sales-change",
  persistence: indexedDbPersistence,
});

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

export function recordSale(sale: Sale): void {
  store.mutate((sales) => appendSale(sales, sale));
}

export function replaceLocalSaleId(oldId: string, newId: string): void {
  store.mutate((sales) => replaceSaleId(sales, oldId, newId));
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
