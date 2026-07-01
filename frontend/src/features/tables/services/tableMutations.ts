import { SYNC_MAX_RETRIES, syncQueue } from "@/lib/offline";

import type { Table, TableCategory, TableOrderItem, TableWithDetails } from "../types";

function countTableItems(items: TableOrderItem[]): number {
  return items.reduce((count, item) => count + item.quantity, 0);
}

export function toStoredTable(table: Table | TableWithDetails): Table {
  if ("total" in table) {
    const { id, number, category, status, items, openedAt } = table;
    return { id, number, category, status, items, openedAt };
  }

  return table;
}

function hasPendingTableMutations(tableId: number): boolean {
  return syncQueue.getAll().some(
    (mutation) =>
      mutation.entity === "tables" &&
      Number(mutation.entityId) === tableId &&
      mutation.retries < SYNC_MAX_RETRIES,
  );
}

export function mergeTableFromServer(local: Table, incoming: TableWithDetails): Table {
  const storedIncoming = toStoredTable(incoming);

  if (hasPendingTableMutations(local.id)) {
    return local;
  }

  const localItemCount = countTableItems(local.items);
  const incomingItemCount = countTableItems(storedIncoming.items);

  if (localItemCount > incomingItemCount) {
    return {
      ...storedIncoming,
      items: local.items,
      status: local.status,
      openedAt: local.openedAt,
    };
  }

  return storedIncoming;
}

export function mergeTablesFromServer(
  local: Table[],
  incoming: TableWithDetails[],
): Table[] {
  const incomingById = new Map(incoming.map((table) => [table.id, table]));
  const mergedIds = new Set<number>();
  const merged: Table[] = [];

  for (const localTable of local) {
    const serverTable = incomingById.get(localTable.id);
    if (serverTable) {
      merged.push(mergeTableFromServer(localTable, serverTable));
      mergedIds.add(localTable.id);
      continue;
    }

    merged.push(localTable);
    mergedIds.add(localTable.id);
  }

  for (const serverTable of incoming) {
    if (!mergedIds.has(serverTable.id)) {
      merged.push(toStoredTable(serverTable));
    }
  }

  return sortTables(merged);
}

export function isTempTableId(id: number): boolean {
  return id < 0;
}

let tempIdCounter = -1;

export function generateTempTableId(): number {
  tempIdCounter -= 1;
  return tempIdCounter;
}

export function applyAddItem(tables: Table[], tableId: number, productId: string): Table[] {
  return tables.map((table) => {
    if (table.id !== tableId) {
      return table;
    }

    const existing = table.items.find((item) => item.productId === productId);
    const items = existing
      ? table.items.map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        )
      : [...table.items, { productId, quantity: 1 }];

    return {
      ...table,
      items,
      status: "occupied" as const,
      openedAt: table.openedAt ?? new Date().toISOString(),
    };
  });
}

export function applyRemoveItem(tables: Table[], tableId: number, productId: string): Table[] {
  return tables.map((table) => {
    if (table.id !== tableId) {
      return table;
    }

    const items = table.items
      .map((item) =>
        item.productId === productId ? { ...item, quantity: item.quantity - 1 } : item,
      )
      .filter((item) => item.quantity > 0);

    const hasItems = items.length > 0;

    return {
      ...table,
      items,
      status: hasItems ? ("occupied" as const) : ("free" as const),
      openedAt: hasItems ? table.openedAt : undefined,
    };
  });
}

export function applyClearTable(tables: Table[], tableId: number): Table[] {
  return tables.map((table) =>
    table.id === tableId
      ? { ...table, items: [], status: "free" as const, openedAt: undefined }
      : table,
  );
}

export function applyPayment(tables: Table[], tableId: number): Table[] {
  return applyClearTable(tables, tableId);
}

export function applyCreateTable(
  tables: Table[],
  input: { number: number; category: TableCategory },
  tempId: number,
): Table[] {
  const table: Table = {
    id: tempId,
    number: input.number,
    category: input.category,
    status: "free",
    items: [],
  };

  return [...tables, table];
}

export function applyUpdateTable(
  tables: Table[],
  tableId: number,
  input: { number?: number; category?: TableCategory },
): Table[] {
  return tables.map((table) =>
    table.id === tableId
      ? {
          ...table,
          number: input.number ?? table.number,
          category: input.category ?? table.category,
        }
      : table,
  );
}

export function applyDeleteTable(tables: Table[], tableId: number): Table[] {
  return tables.filter((table) => table.id !== tableId);
}

export function replaceTableId(tables: Table[], oldId: number, newId: number): Table[] {
  return tables.map((table) => (table.id === oldId ? { ...table, id: newId } : table));
}

export function sortTables(tables: Table[]): Table[] {
  return [...tables].sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.number - b.number;
  });
}
