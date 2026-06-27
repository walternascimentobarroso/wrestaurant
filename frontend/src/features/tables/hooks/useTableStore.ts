"use client";

import { useCallback, useSyncExternalStore } from "react";

import { FAKE_PRODUCTS } from "../data/fakeProducts";
import {
  calculateTableTotal,
  countTableItems,
  getTablesServerSnapshot,
  getTablesSnapshot,
  persistTables,
  subscribeTables,
} from "../services/tableStorage";
import type { Table, TableOrderItem, TableWithDetails } from "../types";

function enrichTable(table: Table): TableWithDetails {
  return {
    ...table,
    total: calculateTableTotal(table.items, FAKE_PRODUCTS),
    itemCount: countTableItems(table.items),
  };
}

function updateTableItems(
  tables: Table[],
  tableId: number,
  updater: (items: TableOrderItem[]) => TableOrderItem[],
): Table[] {
  return tables.map((table) => {
    if (table.id !== tableId) {
      return table;
    }

    const items = updater(table.items);
    const status = items.length > 0 ? "occupied" : "free";

    return {
      ...table,
      items,
      status,
      openedAt: items.length > 0 ? (table.openedAt ?? new Date().toISOString()) : undefined,
    };
  });
}

export function useTableStore() {
  const tables = useSyncExternalStore(
    subscribeTables,
    getTablesSnapshot,
    getTablesServerSnapshot,
  );

  const saveTables = useCallback((nextTables: Table[]) => {
    persistTables(nextTables);
  }, []);

  const getTable = useCallback(
    (tableId: number): TableWithDetails | undefined => {
      const table = tables.find((t) => t.id === tableId);
      return table ? enrichTable(table) : undefined;
    },
    [tables],
  );

  const addProduct = useCallback(
    (tableId: number, productId: string) => {
      saveTables(
        updateTableItems(tables, tableId, (items) => {
          const existing = items.find((item) => item.productId === productId);
          if (existing) {
            return items.map((item) =>
              item.productId === productId
                ? { ...item, quantity: item.quantity + 1 }
                : item,
            );
          }
          return [...items, { productId, quantity: 1 }];
        }),
      );
    },
    [tables, saveTables],
  );

  const removeProduct = useCallback(
    (tableId: number, productId: string) => {
      saveTables(
        updateTableItems(tables, tableId, (items) => {
          return items
            .map((item) =>
              item.productId === productId
                ? { ...item, quantity: item.quantity - 1 }
                : item,
            )
            .filter((item) => item.quantity > 0);
        }),
      );
    },
    [tables, saveTables],
  );

  const clearTable = useCallback(
    (tableId: number) => {
      saveTables(
        tables.map((table) =>
          table.id === tableId
            ? { ...table, status: "free", items: [], openedAt: undefined }
            : table,
        ),
      );
    },
    [tables, saveTables],
  );

  const enrichedTables = tables.map(enrichTable);

  return {
    tables: enrichedTables,
    isLoaded: true,
    getTable,
    addProduct,
    removeProduct,
    clearTable,
  };
}
