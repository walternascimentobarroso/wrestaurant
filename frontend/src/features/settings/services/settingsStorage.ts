import type { AppSettings } from "../types";
import { apiFetch } from "@/lib/api";
import {
  createOfflineStore,
  getItem,
  isOnline,
  syncEngine,
  syncQueue,
} from "@/lib/offline";

const STORAGE_KEY = "settings";
const DEFAULT_SETTINGS: AppSettings = { currency: "EUR" };

const store = createOfflineStore<AppSettings>({
  key: STORAGE_KEY,
  serverSnapshot: DEFAULT_SETTINGS,
  eventName: "restaurant-settings-change",
});

function enqueueAndFlush(
  mutation: Omit<
    Parameters<typeof syncQueue.enqueue>[0],
    "id" | "createdAt" | "retries"
  >,
): void {
  syncQueue.enqueue(mutation);
  void syncEngine.flush();
}

export async function hydrateSettingsIfEmpty(): Promise<void> {
  if (!isOnline()) {
    return;
  }

  const stored = getItem<AppSettings>(STORAGE_KEY);
  if (stored !== null) {
    return;
  }

  try {
    const settings = await apiFetch<AppSettings>("/settings");
    store.replace(settings);
  } catch {
    store.replace(DEFAULT_SETTINGS);
  }
}

export const subscribeSettings = store.subscribe;
export const getSettingsSnapshot = store.getSnapshot;
export const getSettingsServerSnapshot = store.getServerSnapshot;

export function persistSettings(_settings: AppSettings): void {
  // Local state is updated via mutate; no-op for compatibility.
}

export async function persistCurrency(currency: AppSettings["currency"]): Promise<void> {
  store.mutate((settings) => ({ ...settings, currency }));
  enqueueAndFlush({
    entity: "settings",
    operation: "updateCurrency",
    entityId: "settings",
    payload: { currency },
  });
}
