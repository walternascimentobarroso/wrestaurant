"use client";

import { useCallback, useSyncExternalStore } from "react";

import {
  getProductsServerSnapshot,
  getProductsSnapshot,
  subscribeProducts,
} from "@/features/menu/services/productStorage";

import {
  calculateTableTotal,
  countTableItems,
  getTablesServerSnapshot,
  getTablesSnapshot,
  persistTables,
  subscribeTables,
} from "../services/tableStorage";
import type { Product, Table, TableCategory, TableWithDetails } from "../types";

type AdminActionResult = { ok: true } | { ok: false; error: string };

interface CreateTableInput {
  number: number;
  category: TableCategory;
}

interface UpdateTableInput {
  number: number;
  category: TableCategory;
}

function enrichTable(table: Table, products: Product[]): TableWithDetails {
  return {
    ...table,
    total: calculateTableTotal(table.items, products),
    itemCount: countTableItems(table.items),
  };
}

function getNextTableId(tables: Table[]): number {
  if (tables.length === 0) {
    return 1;
  }

  return Math.max(...tables.map((table) => table.id)) + 1;
}

export function useTableAdmin() {
  const products = useSyncExternalStore(
    subscribeProducts,
    getProductsSnapshot,
    getProductsServerSnapshot,
  );

  const tables = useSyncExternalStore(
    subscribeTables,
    getTablesSnapshot,
    getTablesServerSnapshot,
  );

  const saveTables = useCallback((nextTables: Table[]) => {
    persistTables(nextTables);
  }, []);

  const getNextNumber = useCallback(
    (category: TableCategory): number => {
      const categoryTables = tables.filter((table) => table.category === category);
      if (categoryTables.length === 0) {
        return 1;
      }

      return Math.max(...categoryTables.map((table) => table.number)) + 1;
    },
    [tables],
  );

  const createTable = useCallback(
    ({ number, category }: CreateTableInput) => {
      const newTable: Table = {
        id: getNextTableId(tables),
        number,
        category,
        status: "free",
        items: [],
      };

      saveTables([...tables, newTable]);
    },
    [tables, saveTables],
  );

  const updateTable = useCallback(
    (tableId: number, input: UpdateTableInput): AdminActionResult => {
      const table = tables.find((entry) => entry.id === tableId);
      if (!table) {
        return { ok: false, error: "Mesa não encontrada." };
      }

      if (table.status === "occupied") {
        return { ok: false, error: "Não é possível editar uma mesa ocupada." };
      }

      saveTables(
        tables.map((entry) =>
          entry.id === tableId
            ? { ...entry, number: input.number, category: input.category }
            : entry,
        ),
      );

      return { ok: true };
    },
    [tables, saveTables],
  );

  const deleteTable = useCallback(
    (tableId: number): AdminActionResult => {
      const table = tables.find((entry) => entry.id === tableId);
      if (!table) {
        return { ok: false, error: "Mesa não encontrada." };
      }

      if (table.status === "occupied" || table.items.length > 0) {
        return { ok: false, error: "Não é possível excluir uma mesa ocupada." };
      }

      saveTables(tables.filter((entry) => entry.id !== tableId));
      return { ok: true };
    },
    [tables, saveTables],
  );

  return {
    tables: tables.map((table) => enrichTable(table, products)),
    createTable,
    updateTable,
    deleteTable,
    getNextNumber,
  };
}
