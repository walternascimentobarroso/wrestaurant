import type { Table, TableCategory } from "../types";

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
