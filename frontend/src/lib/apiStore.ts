type Listener = () => void;

const INITIAL_LOAD_RETRY_DELAYS_MS = [0, 300, 800] as const;

async function fetchWithRetry<T>(fetchSnapshot: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (const delay of INITIAL_LOAD_RETRY_DELAYS_MS) {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    try {
      return await fetchSnapshot();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

export function createApiStore<T>(options: {
  fetchSnapshot: () => Promise<T>;
  serverSnapshot: T;
  eventName: string;
}) {
  let cache: T = options.serverSnapshot;
  let loaded = false;
  let error: unknown = null;
  let loading: Promise<void> | null = null;
  const listeners = new Set<Listener>();

  function emit() {
    for (const listener of listeners) {
      listener();
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(options.eventName));
    }
  }

  function applyData(data: T) {
    cache = data;
    loaded = true;
    error = null;
    emit();
  }

  async function refresh(): Promise<T> {
    if (typeof window === "undefined") {
      return options.serverSnapshot;
    }

    try {
      const data = await options.fetchSnapshot();
      applyData(data);
      return data;
    } catch (err) {
      error = err;
      emit();
      throw err;
    }
  }

  function ensureLoaded() {
    if (typeof window === "undefined" || loaded || loading) {
      return;
    }

    loading = fetchWithRetry(options.fetchSnapshot)
      .then((data) => {
        applyData(data);
      })
      .catch((err) => {
        error = err;
        emit();
      })
      .finally(() => {
        loading = null;
      });
  }

  function subscribe(listener: Listener): () => void {
    listeners.add(listener);
    ensureLoaded();

    const storageHandler = () => {
      void refresh().catch(() => undefined);
    };

    window.addEventListener(options.eventName, storageHandler);
    return () => {
      listeners.delete(listener);
      window.removeEventListener(options.eventName, storageHandler);
    };
  }

  function getSnapshot(): T {
    ensureLoaded();
    return cache;
  }

  function getServerSnapshot(): T {
    return options.serverSnapshot;
  }

  function scheduleRefresh(): void {
    void refresh().catch(() => undefined);
  }

  return {
    subscribe,
    getSnapshot,
    getServerSnapshot,
    isLoaded: () => loaded,
    getError: () => error,
    refresh,
    scheduleRefresh,
    invalidate() {
      loaded = false;
      error = null;
      ensureLoaded();
    },
  };
}
