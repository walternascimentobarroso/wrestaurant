import type { AppSettings } from "../types";
import { apiFetch } from "@/lib/api";
import { createApiStore } from "@/lib/apiStore";

const store = createApiStore<AppSettings>({
  fetchSnapshot: () => apiFetch<AppSettings>("/settings"),
  serverSnapshot: { currency: "EUR" },
  eventName: "restaurant-settings-change",
});

export const subscribeSettings = store.subscribe;
export const getSettingsSnapshot = store.getSnapshot;
export const getSettingsServerSnapshot = store.getServerSnapshot;

export function persistSettings(_settings: AppSettings): void {
  store.scheduleRefresh();
}

export async function persistCurrency(currency: AppSettings["currency"]): Promise<void> {
  await apiFetch<AppSettings>("/settings", {
    method: "PATCH",
    body: JSON.stringify({ currency }),
  });
  await store.refresh();
}
