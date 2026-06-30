import type { Supplier } from "../types";
import { apiFetch } from "@/lib/api";
import { createApiStore } from "@/lib/apiStore";

const store = createApiStore<Supplier[]>({
  fetchSnapshot: () => apiFetch<Supplier[]>("/suppliers"),
  serverSnapshot: [],
  eventName: "restaurant-suppliers-change",
});

export const subscribeSuppliers = store.subscribe;
export const getSuppliersSnapshot = store.getSnapshot;
export const getSuppliersServerSnapshot = store.getServerSnapshot;

export function persistSuppliers(_suppliers: Supplier[]): void {
  store.scheduleRefresh();
}

export async function createSupplierApi(body: Record<string, unknown>): Promise<Supplier> {
  const supplier = await apiFetch<Supplier>("/suppliers", {
    method: "POST",
    body: JSON.stringify(body),
  });
  await store.refresh();
  return supplier;
}

export async function updateSupplierApi(
  id: string,
  body: Record<string, unknown>,
): Promise<Supplier> {
  const supplier = await apiFetch<Supplier>(`/suppliers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  await store.refresh();
  return supplier;
}

export async function deleteSupplierApi(id: string): Promise<void> {
  await apiFetch<void>(`/suppliers/${id}`, { method: "DELETE" });
  await store.refresh();
}
