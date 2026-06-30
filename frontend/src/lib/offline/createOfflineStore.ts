import { localPersistence } from "./localPersistence";
import type { OfflineStoreOptions, PersistenceAdapter } from "./types";

type Listener = () => void;

export function createOfflineStore<T>(options: OfflineStoreOptions<T>) {
  const persistence: PersistenceAdapter =
    options.persistence ?? localPersistence;

  let cache: T = options.serverSnapshot;
  let loaded = false;
  let error: unknown = null;
  const listeners = new Set<Listener>();

  function emit(): void {
    for (const listener of listeners) {
      listener();
    }
  }

  function loadFromPersistence(): void {
    if (loaded || typeof window === "undefined") {
      return;
    }

    try {
      const stored = persistence.get<T>(options.key);
      if (stored !== null) {
        cache = stored;
      }
      loaded = true;
      error = null;
    } catch (loadError) {
      error = loadError;
      loaded = true;
    }
  }

  function subscribe(listener: Listener): () => void {
    listeners.add(listener);
    if (!loaded) {
      loadFromPersistence();
      emit();
    }
    return () => {
      listeners.delete(listener);
    };
  }

  function getSnapshot(): T {
    if (!loaded && typeof window !== "undefined") {
      loadFromPersistence();
    }
    return cache;
  }

  function getServerSnapshot(): T {
    return options.serverSnapshot;
  }

  function mutate(updater: (prev: T) => T): void {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const next = updater(cache);
      cache = next;
      persistence.set(options.key, next);
      loaded = true;
      error = null;
      emit();
      window.dispatchEvent(new CustomEvent(options.eventName));
    } catch (mutateError) {
      error = mutateError;
      emit();
    }
  }

  function replace(data: T): void {
    if (typeof window === "undefined") {
      return;
    }

    cache = data;
    persistence.set(options.key, data);
    loaded = true;
    error = null;
    emit();
  }

  return {
    subscribe,
    getSnapshot,
    getServerSnapshot,
    mutate,
    replace,
    isLoaded: () => loaded,
    getError: () => error,
  };
}
