import { DEFAULT_CURRENCY } from "../data/currencies";
import type { AppSettings, CurrencyCode } from "../types";

const STORAGE_KEY = "restaurant-settings";
const STORAGE_EVENT = "restaurant-settings-change";

const SERVER_SNAPSHOT: AppSettings = { currency: DEFAULT_CURRENCY };

let cachedClientRaw: string | null | undefined;
let cachedClientSnapshot: AppSettings | null = null;

function parseStoredSettings(raw: string): AppSettings {
  try {
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    const currency = parsed.currency;

    if (currency === "BRL" || currency === "EUR" || currency === "USD") {
      return { currency };
    }
  } catch {
    // fallback below
  }

  return SERVER_SNAPSHOT;
}

function readSettingsFromStorage(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === cachedClientRaw && cachedClientSnapshot !== null) {
      return cachedClientSnapshot;
    }

    cachedClientRaw = raw;
    cachedClientSnapshot = raw ? parseStoredSettings(raw) : SERVER_SNAPSHOT;
    return cachedClientSnapshot;
  } catch {
    cachedClientRaw = null;
    cachedClientSnapshot = SERVER_SNAPSHOT;
    return SERVER_SNAPSHOT;
  }
}

export function subscribeSettings(onStoreChange: () => void): () => void {
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

export function getSettingsSnapshot(): AppSettings {
  return readSettingsFromStorage();
}

export function getSettingsServerSnapshot(): AppSettings {
  return SERVER_SNAPSHOT;
}

export function persistSettings(settings: AppSettings): void {
  const serialized = JSON.stringify(settings);
  localStorage.setItem(STORAGE_KEY, serialized);
  cachedClientRaw = serialized;
  cachedClientSnapshot = settings;
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function persistCurrency(currency: CurrencyCode): void {
  persistSettings({ currency });
}
