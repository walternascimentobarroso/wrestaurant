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
import { registerSupplierSyncHandlers } from "@/features/suppliers/services/supplierSyncHandlers";
import { hydrateSuppliersIfEmpty } from "@/features/suppliers/services/supplierStorage";
import { registerTableSyncHandlers } from "@/features/tables/services/tableSyncHandlers";
import { hydrateTablesIfEmpty } from "@/features/tables/services/tableStorage";
import { apiFetch } from "@/lib/api";
import {
  initIndexedDbPersistence,
  isOnline,
  processQueue,
  registerHandler,
  SYNC_MAX_RETRIES,
  syncEngine,
  syncQueue,
  type SyncEntity,
  type SyncMutation,
} from "@/lib/offline";
import type { AppSettings } from "@/features/settings/types";

let cleanup: (() => void) | null = null;
let handlersRegistered = false;

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
  registerHandler("settings", handleSettingsMutation);
  handlersRegistered = true;
}

export async function hydrateAll(): Promise<void> {
  await initIndexedDbPersistence();
  await Promise.all([
    hydrateTablesIfEmpty(),
    hydrateProductsIfEmpty(),
    hydrateSettingsIfEmpty(),
    hydrateMenuCatalogIfEmpty(),
    hydrateSalesIfEmpty(),
    hydratePayablesIfEmpty(),
    hydrateSuppliersIfEmpty(),
    hydratePurchasesIfEmpty(),
  ]);
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
  void hydrateAll();

  return cleanup;
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
