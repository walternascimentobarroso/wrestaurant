import type { Payable } from "../types";
import { apiFetch } from "@/lib/api";
import { createApiStore } from "@/lib/apiStore";

const store = createApiStore<Payable[]>({
  fetchSnapshot: () => apiFetch<Payable[]>("/payables"),
  serverSnapshot: [],
  eventName: "restaurant-payables-change",
});

export const subscribePayables = store.subscribe;
export const getPayablesSnapshot = store.getSnapshot;
export const getPayablesServerSnapshot = store.getServerSnapshot;

export function persistPayables(_payables: Payable[]): void {
  store.scheduleRefresh();
}

export async function createPayableApi(body: Record<string, unknown>): Promise<Payable> {
  const payable = await apiFetch<Payable>("/payables", {
    method: "POST",
    body: JSON.stringify(body),
  });
  await store.refresh();
  return payable;
}

export async function updatePayableApi(
  id: string,
  body: Record<string, unknown>,
): Promise<Payable> {
  const payable = await apiFetch<Payable>(`/payables/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  await store.refresh();
  return payable;
}

export async function deletePayableApi(id: string): Promise<void> {
  await apiFetch<void>(`/payables/${id}`, { method: "DELETE" });
  await store.refresh();
}

export async function markPayablePaidApi(
  id: string,
  body: { paidAt: string; paidAmount: number },
): Promise<Payable> {
  const payable = await apiFetch<Payable>(`/payables/${id}/mark-paid`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  await store.refresh();
  return payable;
}

export async function markPayablePendingApi(id: string): Promise<Payable> {
  const payable = await apiFetch<Payable>(`/payables/${id}/mark-pending`, {
    method: "POST",
  });
  await store.refresh();
  return payable;
}
