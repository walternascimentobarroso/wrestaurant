import type { Sale } from "../types";

import { getLocalDateKey } from "./formatReportDate";

export interface DailySalesGroup {
  dateKey: string;
  date: Date;
  sales: Sale[];
  total: number;
}

export function groupSalesByDay(sales: Sale[]): DailySalesGroup[] {
  const groups = new Map<string, DailySalesGroup>();

  for (const sale of sales) {
    const dateKey = getLocalDateKey(sale.paidAt);
    const existing = groups.get(dateKey);

    if (existing) {
      existing.sales.push(sale);
      existing.total += sale.total;
      continue;
    }

    const date = new Date(sale.paidAt);
    groups.set(dateKey, {
      dateKey,
      date: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
      sales: [sale],
      total: sale.total,
    });
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      sales: group.sales.sort(
        (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
      ),
    }))
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}
