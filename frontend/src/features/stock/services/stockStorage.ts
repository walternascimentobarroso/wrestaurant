import type { StockMovement } from "../types";

const STORAGE_KEY = "restaurant-stock-movements";
const STORAGE_EVENT = "restaurant-stock-movements-change";

const SERVER_SNAPSHOT: StockMovement[] = [];

let cachedClientRaw: string | null | undefined;
let cachedClientSnapshot: StockMovement[] | null = null;

function parseStoredMovements(raw: string): StockMovement[] {
  try {
    const parsed = JSON.parse(raw) as StockMovement[];
    return Array.isArray(parsed) ? parsed : SERVER_SNAPSHOT;
  } catch {
    return SERVER_SNAPSHOT;
  }
}

function readMovementsFromStorage(): StockMovement[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === cachedClientRaw && cachedClientSnapshot !== null) {
      return cachedClientSnapshot;
    }

    cachedClientRaw = raw;
    cachedClientSnapshot = raw ? parseStoredMovements(raw) : SERVER_SNAPSHOT;
    return cachedClientSnapshot;
  } catch {
    cachedClientRaw = null;
    cachedClientSnapshot = SERVER_SNAPSHOT;
    return SERVER_SNAPSHOT;
  }
}

export function subscribeStockMovements(onStoreChange: () => void): () => void {
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

export function getStockMovementsSnapshot(): StockMovement[] {
  return readMovementsFromStorage();
}

export function getStockMovementsServerSnapshot(): StockMovement[] {
  return SERVER_SNAPSHOT;
}

export function persistStockMovements(movements: StockMovement[]): void {
  const serialized = JSON.stringify(movements);
  localStorage.setItem(STORAGE_KEY, serialized);
  cachedClientRaw = serialized;
  cachedClientSnapshot = movements;
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function appendStockMovements(entries: StockMovement[]): void {
  const existing = readMovementsFromStorage();
  persistStockMovements([...entries, ...existing]);
}
