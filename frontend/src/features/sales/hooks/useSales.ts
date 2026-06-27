"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";

import {
  ensureWeeklyDemoSales,
  getSalesServerSnapshot,
  getSalesSnapshot,
  isSameLocalDay,
  subscribeSales,
} from "../services/salesStorage";
import { groupSalesByDay } from "../utils/groupSalesByDay";

export function useSales() {
  useEffect(() => {
    ensureWeeklyDemoSales();
  }, []);

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

  const salesByDay = useMemo(() => groupSalesByDay(sales), [sales]);

  const allTimeTotal = useMemo(
    () => sales.reduce((sum, sale) => sum + sale.total, 0),
    [sales],
  );

  return {
    dailySales,
    dailyTotal,
    dailySalesCount: dailySales.length,
    salesByDay,
    allTimeTotal,
    allSalesCount: sales.length,
  };
}
