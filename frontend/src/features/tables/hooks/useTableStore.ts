"use client";

import { useCallback, useSyncExternalStore } from "react";

import { ApiError } from "@/lib/api";
import {
  getProductsServerSnapshot,
  getProductsSnapshot,
  isProductsLoaded,
  subscribeProducts,
} from "@/features/menu/services/productStorage";
import type { PaymentDetails } from "@/features/sales/types";
import type { StockActionResult } from "@/features/stock/types";

import {
  addTableItemApi,
  clearTableApi,
  getTablesServerSnapshot,
  getTablesSnapshot,
  isTablesLoaded,
  receivePaymentApi,
  removeTableItemApi,
  subscribeTables,
} from "../services/tableStorage";
import type { Product, Table, TableWithDetails } from "../types";

function enrichTable(table: Table & { total?: number; itemCount?: number }, products: Product[]): TableWithDetails {
  const total =
    table.total ??
    table.items.reduce((sum, item) => {
      const product = products.find((entry) => entry.id === item.productId);
      return sum + (product?.price ?? 0) * item.quantity;
    }, 0);

  const itemCount =
    table.itemCount ?? table.items.reduce((count, item) => count + item.quantity, 0);

  return {
    ...table,
    total,
    itemCount,
  };
}

export function useTableStore() {
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

  const getTable = useCallback(
    (tableId: number): TableWithDetails | undefined => {
      const table = tables.find((t) => t.id === tableId);
      return table ? enrichTable(table, products) : undefined;
    },
    [tables, products],
  );

  const addProduct = useCallback(
    async (tableId: number, productId: string): Promise<StockActionResult> => {
      try {
        await addTableItemApi(tableId, productId);
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof ApiError ? error.message : "Não foi possível adicionar o produto.",
        };
      }
    },
    [],
  );

  const removeProduct = useCallback(async (tableId: number, productId: string) => {
    await removeTableItemApi(tableId, productId);
  }, []);

  const receivePayment = useCallback(
    async (tableId: number, payment: PaymentDetails): Promise<StockActionResult> => {
      try {
        await receivePaymentApi(tableId, payment);
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof ApiError ? error.message : "Não foi possível registrar o pagamento.",
        };
      }
    },
    [],
  );

  const clearTable = useCallback(async (tableId: number) => {
    await clearTableApi(tableId);
  }, []);

  const enrichedTables = tables.map((table) => enrichTable(table, products));

  return {
    tables: enrichedTables,
    isLoaded: isTablesLoaded() && isProductsLoaded(),
    getTable,
    addProduct,
    removeProduct,
    receivePayment,
    clearTable,
  };
}
