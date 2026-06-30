import type { PurchaseRecord } from "../types";
import { apiFetch } from "@/lib/api";
import { createApiStore } from "@/lib/apiStore";

const store = createApiStore<PurchaseRecord[]>({
  fetchSnapshot: () => apiFetch<PurchaseRecord[]>("/purchases"),
  serverSnapshot: [],
  eventName: "restaurant-purchase-history-change",
});

export const subscribePurchases = store.subscribe;
export const getPurchasesSnapshot = store.getSnapshot;
export const getPurchasesServerSnapshot = store.getServerSnapshot;

export function persistPurchases(_records: PurchaseRecord[]): void {
  void store.refresh();
}

export function appendPurchaseRecord(_record: PurchaseRecord): void {
  void store.refresh();
}

export async function recordPurchaseApi(body: Record<string, unknown>): Promise<PurchaseRecord> {
  const record = await apiFetch<PurchaseRecord>("/purchases", {
    method: "POST",
    body: JSON.stringify(body),
  });
  await store.refresh();
  return record;
}
