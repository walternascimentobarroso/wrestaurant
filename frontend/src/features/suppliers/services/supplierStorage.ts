import type { Supplier } from "../types";
import type { SupplierInput } from "../types";
import { apiFetch } from "@/lib/api";
import {
  createOfflineStore,
  generateTempId,
  indexedDbPersistence,
  initIndexedDbPersistence,
  isOnline,
  isTempId,
  syncEngine,
  syncQueue,
} from "@/lib/offline";

import {
  applyCreateSupplier,
  applyDeleteSupplier,
  applyUpdateSupplier,
  replaceSupplierId,
} from "./supplierMutations";

const STORAGE_KEY = "suppliers";

const store = createOfflineStore<Supplier[]>({
  key: STORAGE_KEY,
  serverSnapshot: [],
  eventName: "restaurant-suppliers-change",
  persistence: indexedDbPersistence,
});

const tempIdMap = new Map<string, string>();

function enqueueAndFlush(
  mutation: Omit<
    Parameters<typeof syncQueue.enqueue>[0],
    "id" | "createdAt" | "retries"
  >,
): void {
  syncQueue.enqueue(mutation);
  void syncEngine.flush();
}

export function resolveSupplierId(supplierId: string): string {
  if (!isTempId(supplierId)) {
    return supplierId;
  }
  return tempIdMap.get(supplierId) ?? supplierId;
}

export function replaceTempSupplierId(oldId: string, newId: string): void {
  tempIdMap.set(oldId, newId);
  store.mutate((suppliers) => replaceSupplierId(suppliers, oldId, newId));
  syncQueue.remapEntityId("suppliers", oldId, newId);
}

export function replaceSuppliersFromServer(suppliers: Supplier[]): void {
  store.replace(suppliers);
}

export async function hydrateSuppliersIfEmpty(): Promise<void> {
  await initIndexedDbPersistence();

  if (!isOnline()) {
    return;
  }

  if (store.getSnapshot().length > 0) {
    return;
  }

  try {
    const suppliers = await apiFetch<Supplier[]>("/suppliers");
    replaceSuppliersFromServer(suppliers);
  } catch {
    // Keep local cache until next successful hydrate.
  }
}

export const subscribeSuppliers = store.subscribe;
export const getSuppliersSnapshot = store.getSnapshot;
export const getSuppliersServerSnapshot = store.getServerSnapshot;
export const isSuppliersLoaded = store.isLoaded;

export function persistSuppliers(_suppliers: Supplier[]): void {
  // Local cache is updated via mutate on writes; no-op for compatibility.
}

function findSupplier(id: string): Supplier | undefined {
  return store.getSnapshot().find((supplier) => supplier.id === id);
}

export async function createSupplierApi(body: Record<string, unknown>): Promise<Supplier> {
  const input = body as SupplierInput;
  const tempId = generateTempId();
  const createdAt = new Date().toISOString();
  store.mutate((suppliers) => applyCreateSupplier(suppliers, input, tempId, createdAt));
  enqueueAndFlush({
    entity: "suppliers",
    operation: "create",
    entityId: tempId,
    payload: body,
  });

  const supplier = findSupplier(tempId);
  if (!supplier) {
    throw new Error("Fornecedor não encontrado após criação local.");
  }
  return supplier;
}

export async function updateSupplierApi(
  id: string,
  body: Record<string, unknown>,
): Promise<Supplier> {
  const input = body as SupplierInput;
  store.mutate((suppliers) => applyUpdateSupplier(suppliers, id, input));

  if (isTempId(id)) {
    const pendingCreate = syncQueue.findPendingMutation("suppliers", id, "create");
    if (pendingCreate) {
      syncQueue.updateMutationPayload(pendingCreate.id, {
        ...(pendingCreate.payload as Record<string, unknown>),
        ...body,
      });
    } else {
      enqueueAndFlush({
        entity: "suppliers",
        operation: "update",
        entityId: id,
        payload: body,
      });
    }
  } else {
    enqueueAndFlush({
      entity: "suppliers",
      operation: "update",
      entityId: id,
      payload: body,
    });
  }

  const supplier = findSupplier(id);
  if (!supplier) {
    throw new Error("Fornecedor não encontrado.");
  }
  return supplier;
}

export async function deleteSupplierApi(id: string): Promise<void> {
  store.mutate((suppliers) => applyDeleteSupplier(suppliers, id));
  if (isTempId(id)) {
    syncQueue.removeMutationsForEntityId("suppliers", id);
    return;
  }
  enqueueAndFlush({
    entity: "suppliers",
    operation: "delete",
    entityId: id,
    payload: {},
  });
}
