import { FAKE_PRODUCTS } from "@/features/tables/data/fakeProducts";

import type { Sale, SaleItem } from "../types";
import { getDateKeyFromDate, getLocalDateKey } from "../utils/formatReportDate";

const DEMO_PRODUCTS = FAKE_PRODUCTS.filter((product) =>
  ["p1", "p4", "p8", "p11", "p12", "p16", "p17", "p19", "p21", "p23", "p25"].includes(
    product.id,
  ),
);

const HOURLY_PLAN = [
  { hour: 8, count: 1 },
  { hour: 9, count: 2 },
  { hour: 10, count: 2 },
  { hour: 11, count: 3 },
  { hour: 12, count: 4 },
  { hour: 13, count: 6 },
  { hour: 14, count: 5 },
  { hour: 15, count: 2 },
  { hour: 16, count: 2 },
  { hour: 17, count: 3 },
  { hour: 18, count: 4 },
  { hour: 19, count: 5 },
  { hour: 20, count: 6 },
  { hour: 21, count: 4 },
  { hour: 22, count: 2 },
] as const;

const DAY_VOLUME_SCALE = [0.75, 0.85, 0.9, 0.95, 1, 1.05, 1.1] as const;

function createSeededRandom(seed: number): () => number {
  let state = seed;

  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
    return state / 4_294_967_296;
  };
}

function hashDateKey(dateKey: string): number {
  let hash = 0;
  for (const char of dateKey) {
    hash = (hash * 31 + char.charCodeAt(0)) % 2_147_483_647;
  }
  return hash || 1;
}

export function getPastDaysOfCurrentWeek(reference = new Date()): Date[] {
  const dayOfWeek = reference.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(reference);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(reference.getDate() - mondayOffset);

  const days: Date[] = [];
  for (let index = 0; index < mondayOffset; index += 1) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    days.push(day);
  }

  return days;
}

function buildSaleItems(random: () => number): SaleItem[] {
  const itemCount = 1 + Math.floor(random() * 3);
  const items: SaleItem[] = [];

  for (let index = 0; index < itemCount; index += 1) {
    const product = DEMO_PRODUCTS[Math.floor(random() * DEMO_PRODUCTS.length)];
    const quantity = 1 + Math.floor(random() * 2);
    items.push({
      productId: product.id,
      productName: product.name,
      quantity,
      unitPrice: product.price,
      subtotal: product.price * quantity,
    });
  }

  return items;
}

function createSaleForDay(
  day: Date,
  hour: number,
  minute: number,
  tableNumber: number,
  random: () => number,
): Sale {
  const items = buildSaleItems(random);
  const total = items.reduce((sum, item) => sum + item.subtotal, 0);
  const paymentMethod = random() > 0.45 ? "card" : "cash";
  const paidAt = new Date(day);
  paidAt.setHours(hour, minute, 0, 0);

  const amountReceived =
    paymentMethod === "cash" && random() > 0.5
      ? Math.ceil(total / 10) * 10
      : total;

  return {
    id: crypto.randomUUID(),
    tableNumber,
    paidAt: paidAt.toISOString(),
    paymentMethod,
    amountReceived,
    change: Math.max(0, amountReceived - total),
    total,
    items,
    description: items.map((item) => `${item.quantity}x ${item.productName}`).join(", "),
  };
}

export function generateSalesForDay(day: Date): Sale[] {
  const dateKey = getDateKeyFromDate(day);
  const random = createSeededRandom(hashDateKey(dateKey));
  const dayIndex = day.getDay() === 0 ? 6 : day.getDay() - 1;
  const volumeScale = DAY_VOLUME_SCALE[dayIndex] ?? 1;
  const sales: Sale[] = [];

  for (const { hour, count } of HOURLY_PLAN) {
    const salesThisHour = Math.max(1, Math.round(count * volumeScale));

    for (let index = 0; index < salesThisHour; index += 1) {
      const minute = Math.floor(random() * 59);
      const tableNumber = 1 + Math.floor(random() * 12);
      sales.push(createSaleForDay(day, hour, minute, tableNumber, random));
    }
  }

  return sales.sort(
    (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
  );
}

export function getMissingPastWeekDays(
  existingSales: Sale[],
  reference = new Date(),
): Date[] {
  const pastDays = getPastDaysOfCurrentWeek(reference);

  return pastDays.filter((day) => {
    const dateKey = getDateKeyFromDate(day);
    return !existingSales.some((sale) => getLocalDateKey(sale.paidAt) === dateKey);
  });
}

export function buildWeeklyDemoSales(
  existingSales: Sale[],
  reference = new Date(),
): Sale[] {
  const missingDays = getMissingPastWeekDays(existingSales, reference);
  if (missingDays.length === 0) {
    return existingSales;
  }

  const demoSales = missingDays.flatMap((day) => generateSalesForDay(day));

  return [...demoSales, ...existingSales].sort(
    (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
  );
}
