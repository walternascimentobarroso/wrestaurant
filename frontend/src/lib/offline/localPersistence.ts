import type { PersistenceAdapter } from "./types";

export const STORAGE_PREFIX = "restaurant:v1:";

function fullKey(key: string): string {
  return `${STORAGE_PREFIX}${key}`;
}

export function getItem<T>(key: string): T | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(fullKey(key));
    if (raw === null) {
      return null;
    }
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setItem<T>(key: string, value: T): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(fullKey(key), JSON.stringify(value));
}

export function removeItem(key: string): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(fullKey(key));
}

export const localPersistence: PersistenceAdapter = {
  get: getItem,
  set: setItem,
  remove: removeItem,
  keys(): string[] {
    if (typeof window === "undefined") {
      return [];
    }

    const keys: string[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const storageKey = localStorage.key(index);
      if (storageKey?.startsWith(STORAGE_PREFIX)) {
        keys.push(storageKey.slice(STORAGE_PREFIX.length));
      }
    }
    return keys;
  },
};
