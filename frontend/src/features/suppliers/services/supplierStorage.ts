import { SEED_SUPPLIERS } from "../data/seedSuppliers";
import type { Supplier } from "../types";

const STORAGE_KEY = "restaurant-suppliers";
const STORAGE_EVENT = "restaurant-suppliers-change";

const SERVER_SNAPSHOT = SEED_SUPPLIERS;

let cachedClientRaw: string | null | undefined;
let cachedClientSnapshot: Supplier[] | null = null;

function parseStoredSuppliers(raw: string): Supplier[] {
  try {
    const parsed = JSON.parse(raw) as Supplier[];
    return Array.isArray(parsed) ? parsed : SERVER_SNAPSHOT;
  } catch {
    return SERVER_SNAPSHOT;
  }
}

function readSuppliersFromStorage(): Supplier[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === cachedClientRaw && cachedClientSnapshot !== null) {
      return cachedClientSnapshot;
    }

    cachedClientRaw = raw;
    cachedClientSnapshot = raw ? parseStoredSuppliers(raw) : SERVER_SNAPSHOT;
    return cachedClientSnapshot;
  } catch {
    cachedClientRaw = null;
    cachedClientSnapshot = SERVER_SNAPSHOT;
    return SERVER_SNAPSHOT;
  }
}

export function subscribeSuppliers(onStoreChange: () => void): () => void {
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

export function getSuppliersSnapshot(): Supplier[] {
  return readSuppliersFromStorage();
}

export function getSuppliersServerSnapshot(): Supplier[] {
  return SERVER_SNAPSHOT;
}

export function persistSuppliers(suppliers: Supplier[]): void {
  const serialized = JSON.stringify(suppliers);
  localStorage.setItem(STORAGE_KEY, serialized);
  cachedClientRaw = serialized;
  cachedClientSnapshot = suppliers;
  window.dispatchEvent(new Event(STORAGE_EVENT));
}
