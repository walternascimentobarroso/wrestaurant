import { FAKE_PRODUCTS } from "@/features/tables/data/fakeProducts";
import { calculateTableTotal } from "@/features/tables/services/tableStorage";
import type { Table } from "@/features/tables/types";

import type { PaymentDetails, Sale, SaleItem } from "../types";

const STORAGE_KEY = "restaurant-sales";
const STORAGE_EVENT = "restaurant-sales-change";

const SERVER_SNAPSHOT: Sale[] = [];

let cachedClientRaw: string | null | undefined;
let cachedClientSnapshot: Sale[] | null = null;

function parseStoredSales(raw: string): Sale[] {
  try {
    const parsed = JSON.parse(raw) as Sale[];
    return Array.isArray(parsed) ? parsed : SERVER_SNAPSHOT;
  } catch {
    return SERVER_SNAPSHOT;
  }
}

function readSalesFromStorage(): Sale[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === cachedClientRaw && cachedClientSnapshot !== null) {
      return cachedClientSnapshot;
    }

    cachedClientRaw = raw;
    cachedClientSnapshot = raw ? parseStoredSales(raw) : SERVER_SNAPSHOT;
    return cachedClientSnapshot;
  } catch {
    cachedClientRaw = null;
    cachedClientSnapshot = SERVER_SNAPSHOT;
    return SERVER_SNAPSHOT;
  }
}

export function subscribeSales(onStoreChange: () => void): () => void {
  const handler = (event: Event) => {
    if (event.type === "storage") {
      cachedClientRaw = undefined;
      cachedClientSnapshot = null;
    }
    onStoreChange();
  };

  window.addEventListener(STORAGE_EVENT, handler);
  window.addEventListener("storage", handler);

  return () => {
    window.removeEventListener(STORAGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function getSalesSnapshot(): Sale[] {
  return readSalesFromStorage();
}

export function getSalesServerSnapshot(): Sale[] {
  return SERVER_SNAPSHOT;
}

function buildSaleItems(table: Table): SaleItem[] {
  return table.items.flatMap((item) => {
    const product = FAKE_PRODUCTS.find((p) => p.id === item.productId);
    if (!product) {
      return [];
    }

    return [
      {
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: product.price,
        subtotal: product.price * item.quantity,
      },
    ];
  });
}

function buildDescription(items: SaleItem[]): string {
  return items.map((item) => `${item.quantity}x ${item.productName}`).join(", ");
}

export function createSaleFromTable(
  table: Table,
  payment: PaymentDetails,
): Sale {
  const items = buildSaleItems(table);
  const total = calculateTableTotal(table.items, FAKE_PRODUCTS);

  return {
    id: crypto.randomUUID(),
    tableNumber: table.number,
    paidAt: new Date().toISOString(),
    paymentMethod: payment.method,
    amountReceived: payment.amountReceived,
    change: payment.change,
    total,
    items,
    description: buildDescription(items),
  };
}

export function recordSale(sale: Sale): void {
  const sales = readSalesFromStorage();
  const serialized = JSON.stringify([sale, ...sales]);
  localStorage.setItem(STORAGE_KEY, serialized);
  cachedClientRaw = serialized;
  cachedClientSnapshot = [sale, ...sales];
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function isSameLocalDay(isoDate: string, reference = new Date()): boolean {
  const date = new Date(isoDate);
  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate()
  );
}

export function getTodaySales(reference = new Date()): Sale[] {
  return readSalesFromStorage()
    .filter((sale) => isSameLocalDay(sale.paidAt, reference))
    .sort(
      (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
    );
}
