import type { Table, TableOrderItem } from "../types";
import { apiFetch } from "@/lib/api";
import { createApiStore } from "@/lib/apiStore";

type TableWithDetails = Table & { total: number; itemCount: number };

const store = createApiStore<TableWithDetails[]>({
  fetchSnapshot: () => apiFetch<TableWithDetails[]>("/tables"),
  serverSnapshot: [],
  eventName: "restaurant-tables-change",
});

export const subscribeTables = store.subscribe;
export const getTablesSnapshot = (): Table[] => store.getSnapshot();
export const getTablesServerSnapshot = store.getServerSnapshot;

export async function refreshTables(): Promise<TableWithDetails[]> {
  return store.refresh();
}

export function loadTables(): Table[] {
  return getTablesSnapshot();
}

export function persistTables(_tables: Table[]): void {
  void store.refresh();
}

export function calculateTableTotal(
  items: TableOrderItem[],
  products: { id: string; price: number }[],
): number {
  return items.reduce((total, item) => {
    const product = products.find((p) => p.id === item.productId);
    return total + (product?.price ?? 0) * item.quantity;
  }, 0);
}

export function countTableItems(items: TableOrderItem[]): number {
  return items.reduce((count, item) => count + item.quantity, 0);
}

export async function addTableItemApi(tableId: number, productId: string): Promise<TableWithDetails> {
  const table = await apiFetch<TableWithDetails>(`/tables/${tableId}/items`, {
    method: "POST",
    body: JSON.stringify({ productId }),
  });
  await store.refresh();
  return table;
}

export async function removeTableItemApi(
  tableId: number,
  productId: string,
): Promise<TableWithDetails> {
  const table = await apiFetch<TableWithDetails>(`/tables/${tableId}/items/${productId}`, {
    method: "PATCH",
  });
  await store.refresh();
  return table;
}

export async function clearTableApi(tableId: number): Promise<TableWithDetails> {
  const table = await apiFetch<TableWithDetails>(`/tables/${tableId}/items`, {
    method: "DELETE",
  });
  await store.refresh();
  return table;
}

export async function receivePaymentApi(
  tableId: number,
  payment: { method: string; amountReceived: number; change: number },
): Promise<{ ok: boolean }> {
  const result = await apiFetch<{ ok: boolean }>(`/tables/${tableId}/payment`, {
    method: "POST",
    body: JSON.stringify(payment),
  });
  await store.refresh();
  return result;
}

export async function createTableApi(body: {
  number: number;
  category: string;
}): Promise<TableWithDetails> {
  const table = await apiFetch<TableWithDetails>("/tables", {
    method: "POST",
    body: JSON.stringify(body),
  });
  await store.refresh();
  return table;
}

export async function updateTableApi(
  id: number,
  body: { number?: number; category?: string },
): Promise<TableWithDetails> {
  const table = await apiFetch<TableWithDetails>(`/tables/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  await store.refresh();
  return table;
}

export async function deleteTableApi(id: number): Promise<void> {
  await apiFetch<void>(`/tables/${id}`, { method: "DELETE" });
  await store.refresh();
}
