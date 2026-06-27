import { createInitialTables } from "../data/initialTables";
import type { Table, TableOrderItem } from "../types";

const STORAGE_KEY = "restaurant-tables";
const STORAGE_EVENT = "restaurant-tables-change";

const SERVER_SNAPSHOT = createInitialTables();

let cachedClientRaw: string | null | undefined;
let cachedClientSnapshot: Table[] | null = null;

function parseStoredTables(raw: string): Table[] {
  const parsed = JSON.parse(raw) as Table[];
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return SERVER_SNAPSHOT;
  }
  return parsed;
}

function readTablesFromStorage(): Table[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === cachedClientRaw && cachedClientSnapshot !== null) {
      return cachedClientSnapshot;
    }

    cachedClientRaw = raw;
    cachedClientSnapshot = raw ? parseStoredTables(raw) : SERVER_SNAPSHOT;
    return cachedClientSnapshot;
  } catch {
    cachedClientRaw = null;
    cachedClientSnapshot = SERVER_SNAPSHOT;
    return SERVER_SNAPSHOT;
  }
}

export function subscribeTables(onStoreChange: () => void): () => void {
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

export function getTablesSnapshot(): Table[] {
  return readTablesFromStorage();
}

export function getTablesServerSnapshot(): Table[] {
  return SERVER_SNAPSHOT;
}

export function loadTables(): Table[] {
  if (typeof window === "undefined") {
    return SERVER_SNAPSHOT;
  }

  return readTablesFromStorage();
}

export function persistTables(tables: Table[]): void {
  const serialized = JSON.stringify(tables);
  localStorage.setItem(STORAGE_KEY, serialized);
  cachedClientRaw = serialized;
  cachedClientSnapshot = tables;
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function calculateTableTotal(
  items: TableOrderItem[],
  products: { id: string; price: number }[],
): number {
  return items.reduce((total, item) => {
    const product = products.find((p) => p.id === item.productId);
    return total + (product?.price ?? 0) * item.quantity;
  }, 0);
}

export function countTableItems(items: TableOrderItem[]): number {
  return items.reduce((count, item) => count + item.quantity, 0);
}
