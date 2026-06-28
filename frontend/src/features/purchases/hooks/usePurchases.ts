"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

import {
  getPurchasesServerSnapshot,
  getPurchasesSnapshot,
  subscribePurchases,
} from "../services/purchaseStorage";
import { recordPurchase } from "../services/purchaseService";
import type { PurchaseActionResult, PurchaseInput } from "../types";
import {
  compareWithLastPurchase,
  countPurchasesBySupplier,
  getProductPurchaseHistory,
  getProductPurchaseInsights,
  getSupplierPurchases,
} from "../utils/purchaseInsights";

export function usePurchases() {
  const records = useSyncExternalStore(
    subscribePurchases,
    getPurchasesSnapshot,
    getPurchasesServerSnapshot,
  );

  const recordProductPurchase = useCallback(
    (input: PurchaseInput): PurchaseActionResult => recordPurchase(input),
    [],
  );

  const getHistoryForProduct = useCallback(
    (productId: string) => getProductPurchaseHistory(records, productId),
    [records],
  );

  const getInsightsForProduct = useCallback(
    (productId: string) => getProductPurchaseInsights(records, productId),
    [records],
  );

  const getPurchasesForSupplier = useCallback(
    (supplierId: string) => getSupplierPurchases(records, supplierId),
    [records],
  );

  const comparePriceForProduct = useCallback(
    (productId: string, unitCost: number) =>
      compareWithLastPurchase(unitCost, records, productId),
    [records],
  );

  const countBySupplier = useCallback(
    (supplierId: string) => countPurchasesBySupplier(records, supplierId),
    [records],
  );

  const totalPurchases = useMemo(() => records.length, [records]);

  return {
    records,
    totalPurchases,
    recordProductPurchase,
    getHistoryForProduct,
    getInsightsForProduct,
    getPurchasesForSupplier,
    comparePriceForProduct,
    countBySupplier,
  };
}
