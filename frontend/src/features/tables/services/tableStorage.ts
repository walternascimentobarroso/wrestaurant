import type { Product, Table, TableOrderItem, TableWithDetails, PaymentMethod } from "../types";
import {
  buildSaleFromTable,
  buildSaleIdFromMutationId,
} from "@/features/sales/services/saleMutations";
import { recordSale } from "@/features/sales/services/salesStorage";
import { apiFetch } from "@/lib/api";
import {
  createOfflineStore,
  getItem,
  isOnline,
  syncEngine,
  syncQueue,
} from "@/lib/offline";

import {
  applyAddItem,
  applyClearTable,
  applyCreateTable,
  applyDeleteTable,
  applyPayment,
  applyRemoveItem,
  applyUpdateTable,
  generateTempTableId,
  isTempTableId,
  replaceTableId,
  sortTables,
} from "./tableMutations";

const STORAGE_KEY = "tables";

const store = createOfflineStore<Table[]>({
  key: STORAGE_KEY,
  serverSnapshot: [],
  eventName: "restaurant-tables-change",
});

const tempIdMap = new Map<number, number>();

function enqueueAndFlush(
  mutation: Omit<
    Parameters<typeof syncQueue.enqueue>[0],
    "id" | "createdAt" | "retries"
  >,
): void {
  syncQueue.enqueue(mutation);
  void syncEngine.flush();
}

function getProductsForEnrichment(): Product[] {
  try {
    return getItem<Product[]>("products") ?? [];
  } catch {
    return [];
  }
}

function enrichTable(table: Table, products: Product[]): TableWithDetails {
  return {
    ...table,
    total: calculateTableTotal(table.items, products),
    itemCount: countTableItems(table.items),
  };
}

function findTable(tableId: number): Table | undefined {
  return store.getSnapshot().find((table) => table.id === tableId);
}

function getEnrichedTable(tableId: number): TableWithDetails {
  const table = findTable(tableId);
  if (!table) {
    throw new Error("Mesa não encontrada.");
  }
  return enrichTable(table, getProductsForEnrichment());
}

export function resolveTableId(tableId: number): number {
  if (!isTempTableId(tableId)) {
    return tableId;
  }
  return tempIdMap.get(tableId) ?? tableId;
}

export function replaceTempTableId(oldId: number, newId: number): void {
  tempIdMap.set(oldId, newId);
  store.mutate((tables) => sortTables(replaceTableId(tables, oldId, newId)));
  syncQueue.remapEntityId("tables", oldId, newId);
}

export function replaceTablesFromServer(tables: Table[]): void {
  store.replace(sortTables(tables));
}

export async function hydrateTablesIfEmpty(): Promise<void> {
  if (!isOnline()) {
    return;
  }

  const stored = getItem<Table[]>(STORAGE_KEY);
  if (stored !== null && stored.length > 0) {
    return;
  }

  try {
    const tables = await apiFetch<TableWithDetails[]>("/tables");
    replaceTablesFromServer(tables);
  } catch {
    // Cache stays empty; offline reads still work once populated.
  }
}

export const subscribeTables = store.subscribe;
export const getTablesSnapshot = (): Table[] => store.getSnapshot();
export const getTablesServerSnapshot = store.getServerSnapshot;
export const isTablesLoaded = store.isLoaded;

export async function refreshTables(): Promise<TableWithDetails[]> {
  if (!isOnline()) {
    return getTablesSnapshot().map((table) =>
      enrichTable(table, getProductsForEnrichment()),
    );
  }

  const tables = await apiFetch<TableWithDetails[]>("/tables");
  replaceTablesFromServer(tables);
  return tables;
}

export function loadTables(): Table[] {
  return getTablesSnapshot();
}

export function persistTables(_tables: Table[]): void {
  // Local state is updated via mutate; no-op for compatibility.
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

export async function addTableItemApi(
  tableId: number,
  productId: string,
): Promise<TableWithDetails> {
  store.mutate((tables) => sortTables(applyAddItem(tables, tableId, productId)));
  enqueueAndFlush({
    entity: "tables",
    operation: "addItem",
    entityId: tableId,
    payload: { productId },
  });
  return getEnrichedTable(tableId);
}

export async function removeTableItemApi(
  tableId: number,
  productId: string,
): Promise<TableWithDetails> {
  store.mutate((tables) => sortTables(applyRemoveItem(tables, tableId, productId)));
  enqueueAndFlush({
    entity: "tables",
    operation: "removeItem",
    entityId: tableId,
    payload: { productId },
  });
  return getEnrichedTable(tableId);
}

export async function clearTableApi(tableId: number): Promise<TableWithDetails> {
  store.mutate((tables) => sortTables(applyClearTable(tables, tableId)));
  enqueueAndFlush({
    entity: "tables",
    operation: "clearTable",
    entityId: tableId,
    payload: {},
  });
  return getEnrichedTable(tableId);
}

export async function receivePaymentApi(
  tableId: number,
  payment: { method: string; amountReceived: number; change: number },
): Promise<{ ok: boolean }> {
  const table = findTable(tableId);
  const products = getProductsForEnrichment();
  const mutation = syncQueue.enqueue({
    entity: "tables",
    operation: "payment",
    entityId: tableId,
    payload: payment,
  });

  if (table && table.items.length > 0) {
    const saleId = buildSaleIdFromMutationId(mutation.id);
    recordSale(
      buildSaleFromTable(
        table,
        products,
        {
          method: payment.method as PaymentMethod,
          amountReceived: payment.amountReceived,
          change: payment.change,
        },
        saleId,
      ),
    );
  }

  store.mutate((tables) => sortTables(applyPayment(tables, tableId)));
  void syncEngine.flush();
  return { ok: true };
}

export async function createTableApi(body: {
  number: number;
  category: string;
}): Promise<TableWithDetails> {
  const tempId = generateTempTableId();
  store.mutate((tables) =>
    sortTables(
      applyCreateTable(tables, {
        number: body.number,
        category: body.category as Table["category"],
      }, tempId),
    ),
  );
  enqueueAndFlush({
    entity: "tables",
    operation: "createTable",
    entityId: tempId,
    payload: body,
  });
  return getEnrichedTable(tempId);
}

export async function updateTableApi(
  id: number,
  body: { number?: number; category?: string },
): Promise<TableWithDetails> {
  store.mutate((tables) =>
    sortTables(
      applyUpdateTable(tables, id, {
        number: body.number,
        category: body.category as Table["category"] | undefined,
      }),
    ),
  );
  enqueueAndFlush({
    entity: "tables",
    operation: "updateTable",
    entityId: id,
    payload: body,
  });
  return getEnrichedTable(id);
}

export async function deleteTableApi(id: number): Promise<void> {
  store.mutate((tables) => sortTables(applyDeleteTable(tables, id)));
  if (isTempTableId(id)) {
    syncQueue.removeMutationsForEntityId("tables", id);
    return;
  }
  enqueueAndFlush({
    entity: "tables",
    operation: "deleteTable",
    entityId: id,
    payload: {},
  });
}

export function remapProductIdInTables(oldProductId: string, newProductId: string): void {
  store.mutate((tables) =>
    sortTables(
      tables.map((table) => ({
        ...table,
        items: table.items.map((item) =>
          item.productId === oldProductId
            ? { ...item, productId: newProductId }
            : item,
        ),
      })),
    ),
  );
}
