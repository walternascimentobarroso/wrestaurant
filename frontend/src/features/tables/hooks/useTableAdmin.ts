"use client";

import { useCallback, useSyncExternalStore } from "react";

import {
  getProductsServerSnapshot,
  getProductsSnapshot,
  subscribeProducts,
} from "@/features/menu/services/productStorage";
import { ApiError } from "@/lib/api";

import {
  calculateTableTotal,
  countTableItems,
  createTableApi,
  deleteTableApi,
  getTablesServerSnapshot,
  getTablesSnapshot,
  subscribeTables,
  updateTableApi,
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

  const createTable = useCallback(async ({ number, category }: CreateTableInput) => {
    await createTableApi({ number, category });
  }, []);

  const updateTable = useCallback(
    async (tableId: number, input: UpdateTableInput): Promise<AdminActionResult> => {
      const table = tables.find((entry) => entry.id === tableId);
      if (!table) {
        return { ok: false, error: "Mesa não encontrada." };
      }

      if (table.status === "occupied") {
        return { ok: false, error: "Não é possível editar uma mesa ocupada." };
      }

      try {
        await updateTableApi(tableId, input);
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof ApiError ? error.message : "Não foi possível atualizar a mesa.",
        };
      }
    },
    [tables],
  );

  const deleteTable = useCallback(
    async (tableId: number): Promise<AdminActionResult> => {
      const table = tables.find((entry) => entry.id === tableId);
      if (!table) {
        return { ok: false, error: "Mesa não encontrada." };
      }

      if (table.status === "occupied" || table.items.length > 0) {
        return { ok: false, error: "Não é possível excluir uma mesa ocupada." };
      }

      try {
        await deleteTableApi(tableId);
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof ApiError ? error.message : "Não foi possível excluir a mesa.",
        };
      }
    },
    [tables],
  );

  return {
    tables: tables.map((table) => enrichTable(table, products)),
    createTable,
    updateTable,
    deleteTable,
    getNextNumber,
  };
}
