export type SyncStatus = "synced" | "pending" | "error";

export interface SyncMeta {
  updatedAt: string;
  syncStatus: SyncStatus;
  version: number;
}

export type SyncEntity =
  | "tables"
  | "products"
  | "menuCatalog"
  | "settings"
  | "sales"
  | "payables"
  | "suppliers"
  | "purchases"
  | "stock"
  | "checklists";

export type TableSyncOperation =
  | "addItem"
  | "removeItem"
  | "clearTable"
  | "payment"
  | "createTable"
  | "updateTable"
  | "deleteTable";

export type SettingsSyncOperation = "updateCurrency";

export type MenuCatalogSyncOperation =
  | "createCategory"
  | "updateCategory"
  | "deleteCategory"
  | "createSubcategory"
  | "updateSubcategory"
  | "deleteSubcategory";

export type PayableSyncOperation = "markPaid" | "markPending";

export type StockSyncOperation = "adjust";

export type ChecklistSyncOperation =
  | "toggleCompletion"
  | "updateTemplate"
  | "moveItem";

export type SyncOperation =
  | "create"
  | "update"
  | "delete"
  | TableSyncOperation
  | SettingsSyncOperation
  | MenuCatalogSyncOperation
  | PayableSyncOperation
  | StockSyncOperation
  | ChecklistSyncOperation;

export interface SyncMutation {
  id: string;
  entity: SyncEntity;
  operation: SyncOperation;
  entityId: string | number;
  payload: unknown;
  createdAt: string;
  retries: number;
  lastError?: string;
}

export interface PersistenceAdapter {
  get: <T>(key: string) => T | null;
  set: <T>(key: string, value: T) => void;
  remove: (key: string) => void;
  keys: () => string[];
  /** Optional async preload (IndexedDB). Call before first read when needed. */
  init?: () => Promise<void>;
}

export interface OfflineStoreOptions<T> {
  key: string;
  serverSnapshot: T;
  eventName: string;
  persistence?: PersistenceAdapter;
}

export type SyncHandler = (mutation: SyncMutation) => Promise<void>;

export const SYNC_MAX_RETRIES = 10;

export const SYNC_BACKOFF_MS = [1000, 3000, 10000, 30000] as const;
