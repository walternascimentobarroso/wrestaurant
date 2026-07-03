import type {
  ChecklistCompletion,
  ChecklistItem,
  ChecklistStore,
  ChecklistTemplate,
} from "@/features/checklists/types";
import {
  getChecklistsSnapshot,
  replaceChecklistStoreFromServer,
} from "@/features/checklists/services/checklistStorage";
import { replaceChecklistsFromServer } from "@/features/checklists/services/checklistMutations";
import type { MenuCategory } from "@/features/menu/types";
import {
  dedupeSubcategoriesByName,
  getMenuCatalogSnapshot,
  replaceMenuCatalogFromServer,
} from "@/features/menu/services/menuCatalogStorage";
import {
  getProductsSnapshot,
  replaceProductsFromServer,
} from "@/features/menu/services/productStorage";
import type { Payable } from "@/features/payables/types";
import {
  getPayablesSnapshot,
  replacePayablesFromServer,
} from "@/features/payables/services/payableStorage";
import type { PurchaseRecord } from "@/features/purchases/types";
import {
  getPurchasesSnapshot,
  replacePurchasesFromServer,
} from "@/features/purchases/services/purchaseStorage";
import type { Sale } from "@/features/sales/types";
import {
  getSalesSnapshot,
  replaceSalesFromServer,
} from "@/features/sales/services/salesStorage";
import { replaceSettingsFromServer } from "@/features/settings/services/settingsStorage";
import type { AppSettings } from "@/features/settings/types";
import type { StockMovement } from "@/features/stock/types";
import {
  getStockMovementsSnapshot,
  replaceStockMovementsFromServer,
} from "@/features/stock/services/stockStorage";
import type { Supplier } from "@/features/suppliers/types";
import {
  getSuppliersSnapshot,
  replaceSuppliersFromServer,
} from "@/features/suppliers/services/supplierStorage";
import {
  mergeTablesFromServer,
} from "@/features/tables/services/tableMutations";
import {
  getTablesSnapshot,
  replaceTablesFromServer,
} from "@/features/tables/services/tableStorage";
import type { Product, TableWithDetails } from "@/features/tables/types";

export const DELTA_CURSOR_KEY = "sync-delta-cursor";

export interface ChecklistSyncBundle {
  templates: ChecklistTemplate[];
  items: ChecklistItem[];
  completions: ChecklistCompletion[];
}

export interface SyncSnapshotPayload {
  tables: TableWithDetails[];
  products: Product[];
  settings: AppSettings;
  menuCatalog: MenuCategory[];
  sales: Sale[];
  payables: Payable[];
  suppliers: Supplier[];
  purchases: PurchaseRecord[];
  stockMovements: StockMovement[];
  checklists: ChecklistSyncBundle;
  serverTime: string;
}

export interface SyncDeltaPayload {
  since: string;
  serverTime: string;
  tables: TableWithDetails[];
  products: Product[];
  settings: AppSettings | null;
  menuCatalog: MenuCategory[];
  sales: Sale[];
  payables: Payable[];
  suppliers: Supplier[];
  purchases: PurchaseRecord[];
  stockMovements: StockMovement[];
  checklists: ChecklistSyncBundle;
}

function mergeById<T extends { id: string | number }>(
  local: T[],
  incoming: T[],
): T[] {
  const map = new Map(local.map((item) => [String(item.id), item]));
  for (const item of incoming) {
    map.set(String(item.id), item);
  }
  return Array.from(map.values());
}

function mergeMenuCatalog(
  local: MenuCategory[],
  incoming: MenuCategory[],
): MenuCategory[] {
  const map = new Map(local.map((category) => [category.id, { ...category }]));

  for (const category of incoming) {
    const existing = map.get(category.id);
    if (!existing) {
      map.set(category.id, category);
      continue;
    }

    const subMap = new Map(
      existing.subcategories.map((sub) => [sub.id, sub]),
    );
    for (const sub of category.subcategories) {
      subMap.set(sub.id, sub);
    }

    map.set(category.id, {
      ...category,
      subcategories: dedupeSubcategoriesByName(Array.from(subMap.values())),
    });
  }

  return Array.from(map.values());
}

function mergeChecklistStore(
  local: ChecklistStore,
  incoming: ChecklistSyncBundle,
): ChecklistStore {
  return replaceChecklistsFromServer(
    mergeById(local.templates, incoming.templates),
    mergeById(local.items, incoming.items),
    mergeById(local.completions, incoming.completions),
  );
}

export function applySyncSnapshot(snapshot: SyncSnapshotPayload): void {
  replaceTablesFromServer(
    mergeTablesFromServer(getTablesSnapshot(), snapshot.tables),
  );
  replaceProductsFromServer(snapshot.products);
  replaceSettingsFromServer(snapshot.settings);
  replaceMenuCatalogFromServer(snapshot.menuCatalog);
  replaceSalesFromServer(snapshot.sales);
  replacePayablesFromServer(snapshot.payables);
  replaceSuppliersFromServer(snapshot.suppliers);
  replacePurchasesFromServer(snapshot.purchases);
  replaceStockMovementsFromServer(snapshot.stockMovements);
  replaceChecklistStoreFromServer(
    replaceChecklistsFromServer(
      snapshot.checklists.templates,
      snapshot.checklists.items,
      snapshot.checklists.completions,
    ),
  );
}

export function applySyncDelta(delta: SyncDeltaPayload): void {
  if (delta.tables.length > 0) {
    const merged = mergeTablesFromServer(getTablesSnapshot(), delta.tables);
    replaceTablesFromServer(merged);
  }

  if (delta.products.length > 0) {
    replaceProductsFromServer(
      mergeById(getProductsSnapshot(), delta.products),
    );
  }

  if (delta.settings) {
    replaceSettingsFromServer(delta.settings);
  }

  if (delta.menuCatalog.length > 0) {
    replaceMenuCatalogFromServer(
      mergeMenuCatalog(getMenuCatalogSnapshot(), delta.menuCatalog),
    );
  }

  if (delta.sales.length > 0) {
    replaceSalesFromServer(mergeById(getSalesSnapshot(), delta.sales));
  }

  if (delta.payables.length > 0) {
    replacePayablesFromServer(
      mergeById(getPayablesSnapshot(), delta.payables),
    );
  }

  if (delta.suppliers.length > 0) {
    replaceSuppliersFromServer(
      mergeById(getSuppliersSnapshot(), delta.suppliers),
    );
  }

  if (delta.purchases.length > 0) {
    replacePurchasesFromServer(
      mergeById(getPurchasesSnapshot(), delta.purchases),
    );
  }

  if (delta.stockMovements.length > 0) {
    replaceStockMovementsFromServer(
      mergeById(getStockMovementsSnapshot(), delta.stockMovements),
    );
  }

  const checklistChanged =
    delta.checklists.templates.length > 0 ||
    delta.checklists.items.length > 0 ||
    delta.checklists.completions.length > 0;

  if (checklistChanged) {
    replaceChecklistStoreFromServer(
      mergeChecklistStore(getChecklistsSnapshot(), delta.checklists),
    );
  }
}
