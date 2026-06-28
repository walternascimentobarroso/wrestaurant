import type { PurchaseRecord } from "../types";

const STORAGE_KEY = "restaurant-purchase-history";
const STORAGE_EVENT = "restaurant-purchase-history-change";

const SERVER_SNAPSHOT: PurchaseRecord[] = [];

let cachedClientRaw: string | null | undefined;
let cachedClientSnapshot: PurchaseRecord[] | null = null;

function parseStoredPurchases(raw: string): PurchaseRecord[] {
  try {
    const parsed = JSON.parse(raw) as PurchaseRecord[];
    return Array.isArray(parsed) ? parsed : SERVER_SNAPSHOT;
  } catch {
    return SERVER_SNAPSHOT;
  }
}

function readPurchasesFromStorage(): PurchaseRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === cachedClientRaw && cachedClientSnapshot !== null) {
      return cachedClientSnapshot;
    }

    cachedClientRaw = raw;
    cachedClientSnapshot = raw ? parseStoredPurchases(raw) : SERVER_SNAPSHOT;
    return cachedClientSnapshot;
  } catch {
    cachedClientRaw = null;
    cachedClientSnapshot = SERVER_SNAPSHOT;
    return SERVER_SNAPSHOT;
  }
}

export function subscribePurchases(onStoreChange: () => void): () => void {
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

export function getPurchasesSnapshot(): PurchaseRecord[] {
  return readPurchasesFromStorage();
}

export function getPurchasesServerSnapshot(): PurchaseRecord[] {
  return SERVER_SNAPSHOT;
}

export function persistPurchases(records: PurchaseRecord[]): void {
  const serialized = JSON.stringify(records);
  localStorage.setItem(STORAGE_KEY, serialized);
  cachedClientRaw = serialized;
  cachedClientSnapshot = records;
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function appendPurchaseRecord(record: PurchaseRecord): void {
  const existing = readPurchasesFromStorage();
  persistPurchases([record, ...existing]);
}
