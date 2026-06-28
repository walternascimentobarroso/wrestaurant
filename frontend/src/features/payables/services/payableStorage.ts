import { buildSeedPayables } from "../data/seedPayables";
import type { Payable, PayableRecurrence } from "../types";

const STORAGE_KEY = "restaurant-payables";
const STORAGE_EVENT = "restaurant-payables-change";

const SERVER_SNAPSHOT = buildSeedPayables();

let cachedClientRaw: string | null | undefined;
let cachedClientSnapshot: Payable[] | null = null;

interface LegacyPayable extends Partial<Payable> {
  supplier?: string;
}

function normalizeRecurrence(value: PayableRecurrence | undefined): PayableRecurrence {
  return value ?? "none";
}

function normalizePayable(raw: LegacyPayable): Payable {
  return {
    id: raw.id ?? "",
    categoryId: raw.categoryId ?? "other",
    description: raw.description ?? "",
    supplierId: raw.supplierId,
    amount: raw.amount ?? 0,
    dueDate: raw.dueDate ?? "",
    recurrence: normalizeRecurrence(raw.recurrence),
    status: raw.status ?? "pending",
    paidAt: raw.paidAt,
    paidAmount: raw.paidAmount,
    notes: raw.notes,
    createdAt: raw.createdAt ?? new Date().toISOString(),
  };
}

function parseStoredPayables(raw: string): Payable[] {
  try {
    const parsed = JSON.parse(raw) as LegacyPayable[];
    return Array.isArray(parsed) ? parsed.map(normalizePayable) : SERVER_SNAPSHOT;
  } catch {
    return SERVER_SNAPSHOT;
  }
}

function readPayablesFromStorage(): Payable[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === cachedClientRaw && cachedClientSnapshot !== null) {
      return cachedClientSnapshot;
    }

    cachedClientRaw = raw;
    cachedClientSnapshot = raw ? parseStoredPayables(raw) : SERVER_SNAPSHOT;
    return cachedClientSnapshot;
  } catch {
    cachedClientRaw = null;
    cachedClientSnapshot = SERVER_SNAPSHOT;
    return SERVER_SNAPSHOT;
  }
}

export function subscribePayables(onStoreChange: () => void): () => void {
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

export function getPayablesSnapshot(): Payable[] {
  return readPayablesFromStorage();
}

export function getPayablesServerSnapshot(): Payable[] {
  return SERVER_SNAPSHOT;
}

export function persistPayables(payables: Payable[]): void {
  const serialized = JSON.stringify(payables);
  localStorage.setItem(STORAGE_KEY, serialized);
  cachedClientRaw = serialized;
  cachedClientSnapshot = payables;
  window.dispatchEvent(new Event(STORAGE_EVENT));
}
