"use client";

import { useMemo, useSyncExternalStore } from "react";

import {
  getSalesServerSnapshot,
  getSalesSnapshot,
  isSameLocalDay,
  subscribeSales,
} from "../services/salesStorage";

export function useSales() {
  const sales = useSyncExternalStore(
    subscribeSales,
    getSalesSnapshot,
    getSalesServerSnapshot,
  );

  const dailySales = useMemo(
    () =>
      sales
        .filter((sale) => isSameLocalDay(sale.paidAt))
        .sort(
          (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
        ),
    [sales],
  );

  const dailyTotal = useMemo(
    () => dailySales.reduce((sum, sale) => sum + sale.total, 0),
    [dailySales],
  );

  return {
    dailySales,
    dailyTotal,
  };
}
