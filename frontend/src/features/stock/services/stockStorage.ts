import type { StockMovement } from "../types";
import { apiFetch } from "@/lib/api";
import { createApiStore } from "@/lib/apiStore";

const store = createApiStore<StockMovement[]>({
  fetchSnapshot: () => apiFetch<StockMovement[]>("/stock/movements"),
  serverSnapshot: [],
  eventName: "restaurant-stock-movements-change",
});

export const subscribeStockMovements = store.subscribe;
export const getStockMovementsSnapshot = store.getSnapshot;
export const getStockMovementsServerSnapshot = store.getServerSnapshot;

export function persistStockMovements(_movements: StockMovement[]): void {
  void store.refresh();
}

export function appendStockMovements(_entries: StockMovement[]): void {
  void store.refresh();
}

export async function adjustStockApi(body: {
  productId: string;
  delta: number;
  type: string;
  reason: string;
}): Promise<StockMovement> {
  const movement = await apiFetch<StockMovement>("/stock/adjustments", {
    method: "POST",
    body: JSON.stringify(body),
  });
  await store.refresh();
  return movement;
}
