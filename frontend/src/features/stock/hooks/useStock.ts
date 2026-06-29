"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

import {
  getProductsServerSnapshot,
  getProductsSnapshot,
  subscribeProducts,
} from "@/features/menu/services/productStorage";
import { isIngredient, tracksOwnStock } from "@/features/recipes/utils/productKind";
import type { Product } from "@/features/tables/types";

import {
  adjustProductStock,
  filterStockProducts,
} from "../services/stockService";
import {
  getStockMovementsServerSnapshot,
  getStockMovementsSnapshot,
  subscribeStockMovements,
} from "../services/stockStorage";
import type { StockActionResult, StockFilter, StockMovementType } from "../types";
import { isLowStock, isOutOfStock } from "../utils/productStock";

export function useStock() {
  const products = useSyncExternalStore(
    subscribeProducts,
    getProductsSnapshot,
    getProductsServerSnapshot,
  );

  const movements = useSyncExternalStore(
    subscribeStockMovements,
    getStockMovementsSnapshot,
    getStockMovementsServerSnapshot,
  );

  const trackedProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          product.trackStock && (isIngredient(product) || tracksOwnStock(product)),
      ),
    [products],
  );

  const lowStockCount = useMemo(
    () => trackedProducts.filter((product) => isLowStock(product)).length,
    [trackedProducts],
  );

  const outOfStockCount = useMemo(
    () => trackedProducts.filter(isOutOfStock).length,
    [trackedProducts],
  );

  const getFilteredProducts = useCallback(
    (filter: StockFilter): Product[] => filterStockProducts(products, filter),
    [products],
  );

  const adjustStock = useCallback(
    (
      productId: string,
      delta: number,
      type: StockMovementType,
      reason: string,
    ): StockActionResult => adjustProductStock(productId, delta, type, reason),
    [],
  );

  return {
    products,
    movements,
    trackedProducts,
    lowStockCount,
    outOfStockCount,
    getFilteredProducts,
    adjustStock,
  };
}
