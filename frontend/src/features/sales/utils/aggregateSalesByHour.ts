import type { Sale } from "../types";
import { getSaleSessionStart } from "./formatReportDate";

export interface HourlySalesBucket {
  hour: number;
  total: number;
  count: number;
}

export function aggregateSalesByHour(sales: Sale[]): HourlySalesBucket[] {
  if (sales.length === 0) {
    return [];
  }

  const buckets = new Map<number, HourlySalesBucket>();
  for (const sale of sales) {
    const hour = new Date(getSaleSessionStart(sale)).getHours();
    const existing = buckets.get(hour) ?? { hour, total: 0, count: 0 };
    buckets.set(hour, {
      hour,
      total: existing.total + sale.total,
      count: existing.count + 1,
    });
  }

  const activeHours = [...buckets.keys()].sort((a, b) => a - b);
  const minHour = Math.max(0, activeHours[0] - 1);
  const maxHour = Math.min(23, activeHours[activeHours.length - 1] + 1);

  return Array.from({ length: maxHour - minHour + 1 }, (_, index) => {
    const hour = minHour + index;
    return buckets.get(hour) ?? { hour, total: 0, count: 0 };
  });
}

export function findPeakHour(buckets: HourlySalesBucket[]): HourlySalesBucket | null {
  if (buckets.length === 0) {
    return null;
  }

  return buckets.reduce((peak, bucket) =>
    bucket.total > peak.total ? bucket : peak,
  );
}
