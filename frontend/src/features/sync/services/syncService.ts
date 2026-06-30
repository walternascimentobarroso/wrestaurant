import { registerChecklistSyncHandlers } from "@/features/checklists/services/checklistSyncHandlers";
import { hydrateChecklistsIfEmpty } from "@/features/checklists/services/checklistStorage";
import { registerMenuCatalogSyncHandlers } from "@/features/menu/services/menuSyncHandlers";
import { registerProductSyncHandlers } from "@/features/menu/services/productSyncHandlers";
import { hydrateMenuCatalogIfEmpty } from "@/features/menu/services/menuCatalogStorage";
import { hydrateProductsIfEmpty } from "@/features/menu/services/productStorage";
import { registerPayableSyncHandlers } from "@/features/payables/services/payableSyncHandlers";
import { hydratePayablesIfEmpty } from "@/features/payables/services/payableStorage";
import { registerPurchaseSyncHandlers } from "@/features/purchases/services/purchaseSyncHandlers";
import { hydratePurchasesIfEmpty } from "@/features/purchases/services/purchaseStorage";
import { registerSalesSyncHandlers } from "@/features/sales/services/salesSyncHandlers";
import { hydrateSalesIfEmpty } from "@/features/sales/services/salesStorage";
import { hydrateSettingsIfEmpty } from "@/features/settings/services/settingsStorage";
import { registerStockSyncHandlers } from "@/features/stock/services/stockSyncHandlers";
import { hydrateStockMovementsIfEmpty } from "@/features/stock/services/stockStorage";
import { registerSupplierSyncHandlers } from "@/features/suppliers/services/supplierSyncHandlers";
import { hydrateSuppliersIfEmpty } from "@/features/suppliers/services/supplierStorage";
import { registerTableSyncHandlers } from "@/features/tables/services/tableSyncHandlers";
import { hydrateTablesIfEmpty } from "@/features/tables/services/tableStorage";
import { apiFetch } from "@/lib/api";
import {
  getItem,
  initIndexedDbPersistence,
  isOnline,
  processQueue,
  registerHandler,
  setItem,
  SYNC_MAX_RETRIES,
  syncEngine,
  syncQueue,
  type SyncEntity,
  type SyncMutation,
} from "@/lib/offline";
import type { AppSettings } from "@/features/settings/types";

import {
  applySyncDelta,
  applySyncSnapshot,
  DELTA_CURSOR_KEY,
  type SyncDeltaPayload,
  type SyncSnapshotPayload,
} from "./syncHydration";

const DELTA_POLL_MS = 60_000;

let cleanup: (() => void) | null = null;
let handlersRegistered = false;
let deltaPollTimer: ReturnType<typeof setInterval> | null = null;

async function handleSettingsMutation(mutation: SyncMutation): Promise<void> {
  if (mutation.operation !== "updateCurrency") {
    throw new Error(`Operação de settings desconhecida: ${mutation.operation}`);
  }

  const { currency } = mutation.payload as AppSettings;
  await apiFetch<AppSettings>("/settings", {
    method: "PATCH",
    body: JSON.stringify({ currency }),
  });
}

function registerSyncHandlers(): void {
  if (handlersRegistered) {
    return;
  }

  registerTableSyncHandlers();
  registerProductSyncHandlers();
  registerMenuCatalogSyncHandlers();
  registerSalesSyncHandlers();
  registerPayableSyncHandlers();
  registerSupplierSyncHandlers();
  registerPurchaseSyncHandlers();
  registerStockSyncHandlers();
  registerChecklistSyncHandlers();
  registerHandler("settings", handleSettingsMutation);
  handlersRegistered = true;
}

async function hydrateAllFromSnapshot(): Promise<boolean> {
  try {
    const snapshot = await apiFetch<SyncSnapshotPayload>("/sync/snapshot");
    applySyncSnapshot(snapshot);
    setItem(DELTA_CURSOR_KEY, snapshot.serverTime);
    return true;
  } catch {
    return false;
  }
}

async function hydrateAllFallback(): Promise<void> {
  await Promise.all([
    hydrateTablesIfEmpty(),
    hydrateProductsIfEmpty(),
    hydrateSettingsIfEmpty(),
    hydrateMenuCatalogIfEmpty(),
    hydrateSalesIfEmpty(),
    hydratePayablesIfEmpty(),
    hydrateSuppliersIfEmpty(),
    hydratePurchasesIfEmpty(),
    hydrateStockMovementsIfEmpty(),
    hydrateChecklistsIfEmpty(),
  ]);
}

export async function hydrateAll(): Promise<void> {
  await initIndexedDbPersistence();

  if (isOnline()) {
    const hydrated = await hydrateAllFromSnapshot();
    if (hydrated) {
      return;
    }
  }

  await hydrateAllFallback();
}

export async function pullSyncDelta(): Promise<void> {
  if (!isOnline()) {
    return;
  }

  const cursor = getItem<string>(DELTA_CURSOR_KEY);
  if (!cursor) {
    return;
  }

  try {
    const delta = await apiFetch<SyncDeltaPayload>(
      `/sync/delta?since=${encodeURIComponent(cursor)}`,
    );
    applySyncDelta(delta);
    setItem(DELTA_CURSOR_KEY, delta.serverTime);
  } catch {
    // Background pull failures are non-fatal.
  }
}

function startDeltaPolling(): void {
  if (deltaPollTimer !== null || typeof window === "undefined") {
    return;
  }

  deltaPollTimer = setInterval(() => {
    void pullSyncDelta();
  }, DELTA_POLL_MS);
}

function stopDeltaPolling(): void {
  if (deltaPollTimer !== null) {
    clearInterval(deltaPollTimer);
    deltaPollTimer = null;
  }
}

export async function hydrateFromServer(
  entity: SyncEntity,
  fetcher: () => Promise<unknown>,
  options?: { force?: boolean },
): Promise<void> {
  if (!isOnline()) {
    return;
  }

  if (!options?.force) {
    const hydrators: Partial<Record<SyncEntity, () => Promise<void>>> = {
      tables: hydrateTablesIfEmpty,
      products: hydrateProductsIfEmpty,
      settings: hydrateSettingsIfEmpty,
      menuCatalog: hydrateMenuCatalogIfEmpty,
      sales: hydrateSalesIfEmpty,
      payables: hydratePayablesIfEmpty,
      suppliers: hydrateSuppliersIfEmpty,
      purchases: hydratePurchasesIfEmpty,
      stock: hydrateStockMovementsIfEmpty,
      checklists: hydrateChecklistsIfEmpty,
    };

    const hydrate = hydrators[entity];
    if (hydrate) {
      await hydrate();
      return;
    }
  }

  await fetcher();
}

export function initSync(): () => void {
  if (cleanup) {
    return cleanup;
  }

  registerSyncHandlers();
  cleanup = syncEngine.start();
  void hydrateAll().then(() => {
    void pullSyncDelta();
  });
  startDeltaPolling();

  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }

  return () => {
    cleanup?.();
    cleanup = null;
    stopDeltaPolling();
  };
}

export function getSyncStatus(): {
  online: boolean;
  pending: number;
  errors: number;
} {
  const all = syncQueue.getAll();
  const pending = all.filter(
    (mutation) => mutation.retries < SYNC_MAX_RETRIES,
  ).length;
  const errors = all.filter(
    (mutation) => mutation.retries >= SYNC_MAX_RETRIES,
  ).length;

  return {
    online: isOnline(),
    pending,
    errors,
  };
}

export function retryFailed(): void {
  syncQueue.resetAllFailedRetries();
  void processQueue();
}

export function retryMutationById(mutationId: string): void {
  syncQueue.resetRetries(mutationId);
  void processQueue();
}

export function discardMutationById(mutationId: string): void {
  syncQueue.dequeue(mutationId);
}
