import type { PersistenceAdapter } from "./types";

const DB_NAME = "restaurant-offline";
const DB_VERSION = 1;
const STORE_NAME = "kv";
const FLUSH_MS = 500;

const memory = new Map<string, unknown>();
const pendingWrites = new Map<string, unknown | null>();

let initPromise: Promise<void> | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error ?? new Error("Falha ao abrir IndexedDB."));
    };
  });
}

async function loadFromIndexedDb(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  const database = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.openCursor();

    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve();
        return;
      }

      memory.set(String(cursor.key), cursor.value);
      cursor.continue();
    };

    request.onerror = () => {
      reject(request.error ?? new Error("Falha ao ler IndexedDB."));
    };
  });

  database.close();
}

async function flushToIndexedDb(): Promise<void> {
  if (typeof window === "undefined" || pendingWrites.size === 0) {
    return;
  }

  const writes = new Map(pendingWrites);
  pendingWrites.clear();

  const database = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    for (const [key, value] of writes) {
      if (value === null) {
        store.delete(key);
      } else {
        store.put(value, key);
      }
    }

    transaction.oncomplete = () => {
      database.close();
      resolve();
    };

    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("Falha ao gravar IndexedDB."));
    };
  });
}

function scheduleFlush(): void {
  if (typeof window === "undefined") {
    return;
  }

  if (flushTimer !== null) {
    clearTimeout(flushTimer);
  }

  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushToIndexedDb();
  }, FLUSH_MS);
}

/**
 * IndexedDB adapter with an in-memory read cache and debounced async writes.
 * Keeps createOfflineStore synchronous while persisting larger financial datasets.
 */
export async function initIndexedDbPersistence(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  initPromise ??= loadFromIndexedDb();
  await initPromise;
}

export const indexedDbPersistence: PersistenceAdapter = {
  init: initIndexedDbPersistence,

  get<T>(key: string): T | null {
    if (!memory.has(key)) {
      return null;
    }
    return memory.get(key) as T;
  },

  set<T>(key: string, value: T): void {
    memory.set(key, value);
    pendingWrites.set(key, value);
    scheduleFlush();
  },

  remove(key: string): void {
    memory.delete(key);
    pendingWrites.set(key, null);
    scheduleFlush();
  },

  keys(): string[] {
    return [...memory.keys()];
  },
};
