import type { Sale } from "../types";
import { apiFetch } from "@/lib/api";
import { createApiStore } from "@/lib/apiStore";

const store = createApiStore<Sale[]>({
  fetchSnapshot: () => apiFetch<Sale[]>("/sales"),
  serverSnapshot: [],
  eventName: "restaurant-sales-change",
});

export const subscribeSales = store.subscribe;
export const getSalesSnapshot = store.getSnapshot;
export const getSalesServerSnapshot = store.getServerSnapshot;

export function persistSales(_sales: Sale[]): void {
  void store.refresh();
}

export function ensureWeeklyDemoSales(): void {
  // demo data is seeded on the backend when empty
}

export function recordSale(_sale: Sale): void {
  void store.refresh();
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
