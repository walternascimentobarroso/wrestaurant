import type { Payable } from "../types";
import type { PayableFormInput } from "../types";
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
  applyCreatePayable,
  applyDeletePayable,
  applyMarkPayablePaid,
  applyMarkPayablePending,
  applyUpdatePayable,
  replacePayableId,
} from "./payableMutations";

const STORAGE_KEY = "payables";

const store = createOfflineStore<Payable[]>({
  key: STORAGE_KEY,
  serverSnapshot: [],
  eventName: "restaurant-payables-change",
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

export function resolvePayableId(payableId: string): string {
  if (!isTempId(payableId)) {
    return payableId;
  }
  return tempIdMap.get(payableId) ?? payableId;
}

export function replaceTempPayableId(oldId: string, newId: string): void {
  tempIdMap.set(oldId, newId);
  store.mutate((payables) => replacePayableId(payables, oldId, newId));
  syncQueue.remapEntityId("payables", oldId, newId);
}

export function replacePayablesFromServer(payables: Payable[]): void {
  store.replace(payables);
}

export async function hydratePayablesIfEmpty(): Promise<void> {
  await initIndexedDbPersistence();

  if (!isOnline()) {
    return;
  }

  if (store.getSnapshot().length > 0) {
    return;
  }

  try {
    const payables = await apiFetch<Payable[]>("/payables");
    replacePayablesFromServer(payables);
  } catch {
    // Keep local cache until next successful hydrate.
  }
}

export const subscribePayables = store.subscribe;
export const getPayablesSnapshot = store.getSnapshot;
export const getPayablesServerSnapshot = store.getServerSnapshot;
export const isPayablesLoaded = store.isLoaded;

export function persistPayables(payables: Payable[]): void {
  void payables;
  // Local cache is updated via mutate on writes; no-op for compatibility.
}

function findPayable(id: string): Payable | undefined {
  return store.getSnapshot().find((payable) => payable.id === id);
}

export async function createPayableApi(body: PayableFormInput): Promise<Payable> {
  const tempId = generateTempId();
  const createdAt = new Date().toISOString();
  store.mutate((payables) => applyCreatePayable(payables, body, tempId, createdAt));
  enqueueAndFlush({
    entity: "payables",
    operation: "create",
    entityId: tempId,
    payload: body,
  });

  const payable = findPayable(tempId);
  if (!payable) {
    throw new Error("Conta não encontrada após criação local.");
  }
  return payable;
}

export async function updatePayableApi(
  id: string,
  body: PayableFormInput,
): Promise<Payable> {
  store.mutate((payables) => applyUpdatePayable(payables, id, body));

  if (isTempId(id)) {
    const pendingCreate = syncQueue.findPendingMutation("payables", id, "create");
    if (pendingCreate) {
      syncQueue.updateMutationPayload(pendingCreate.id, {
        ...(pendingCreate.payload as Record<string, unknown>),
        ...body,
      });
    } else {
      enqueueAndFlush({
        entity: "payables",
        operation: "update",
        entityId: id,
        payload: body,
      });
    }
  } else {
    enqueueAndFlush({
      entity: "payables",
      operation: "update",
      entityId: id,
      payload: body,
    });
  }

  const payable = findPayable(id);
  if (!payable) {
    throw new Error("Conta não encontrada.");
  }
  return payable;
}

export async function deletePayableApi(id: string): Promise<void> {
  store.mutate((payables) => applyDeletePayable(payables, id));
  if (isTempId(id)) {
    syncQueue.removeMutationsForEntityId("payables", id);
    return;
  }
  enqueueAndFlush({
    entity: "payables",
    operation: "delete",
    entityId: id,
    payload: {},
  });
}

export async function markPayablePaidApi(
  id: string,
  body: { paidAt: string; paidAmount: number },
): Promise<Payable> {
  store.mutate((payables) =>
    applyMarkPayablePaid(payables, id, body.paidAt, body.paidAmount),
  );

  if (isTempId(id)) {
    const pendingCreate = syncQueue.findPendingMutation("payables", id, "create");
    if (pendingCreate) {
      syncQueue.updateMutationPayload(pendingCreate.id, {
        ...(pendingCreate.payload as Record<string, unknown>),
        status: "paid",
        paidAt: body.paidAt,
        paidAmount: body.paidAmount,
      });
    } else {
      enqueueAndFlush({
        entity: "payables",
        operation: "markPaid",
        entityId: id,
        payload: body,
      });
    }
  } else {
    enqueueAndFlush({
      entity: "payables",
      operation: "markPaid",
      entityId: id,
      payload: body,
    });
  }

  const payable = findPayable(id);
  if (!payable) {
    throw new Error("Conta não encontrada.");
  }
  return payable;
}

export async function markPayablePendingApi(id: string): Promise<Payable> {
  store.mutate((payables) => applyMarkPayablePending(payables, id));

  if (isTempId(id)) {
    const pendingCreate = syncQueue.findPendingMutation("payables", id, "create");
    if (pendingCreate) {
      syncQueue.updateMutationPayload(pendingCreate.id, {
        ...(pendingCreate.payload as Record<string, unknown>),
        status: "pending",
        paidAt: undefined,
        paidAmount: undefined,
      });
    } else {
      enqueueAndFlush({
        entity: "payables",
        operation: "markPending",
        entityId: id,
        payload: {},
      });
    }
  } else {
    enqueueAndFlush({
      entity: "payables",
      operation: "markPending",
      entityId: id,
      payload: {},
    });
  }

  const payable = findPayable(id);
  if (!payable) {
    throw new Error("Conta não encontrada.");
  }
  return payable;
}
