type Listener = () => void;

export function createApiStore<T>(options: {
  fetchSnapshot: () => Promise<T>;
  serverSnapshot: T;
  eventName: string;
}) {
  let cache: T = options.serverSnapshot;
  let loaded = false;
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

  async function refresh(): Promise<T> {
    if (typeof window === "undefined") {
      return options.serverSnapshot;
    }

    const data = await options.fetchSnapshot();
    cache = data;
    loaded = true;
    emit();
    return data;
  }

  function ensureLoaded() {
    if (typeof window === "undefined" || loaded || loading) {
      return;
    }

    loading = refresh()
      .then(() => undefined)
      .finally(() => {
        loading = null;
      });
  }

  function subscribe(listener: Listener): () => void {
    listeners.add(listener);
    ensureLoaded();

    const storageHandler = () => {
      void refresh();
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

  return {
    subscribe,
    getSnapshot,
    getServerSnapshot,
    refresh,
    invalidate() {
      loaded = false;
      ensureLoaded();
    },
  };
}
