import { generateMutationId } from "./idGenerator";
import { getItem, setItem } from "./localPersistence";
import {
  SYNC_MAX_RETRIES,
  type SyncEntity,
  type SyncMutation,
} from "./types";

const QUEUE_KEY = "sync-queue";

type Listener = () => void;

const listeners = new Set<Listener>();
const serverSnapshot: SyncMutation[] = [];

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

function readQueue(): SyncMutation[] {
  return getItem<SyncMutation[]>(QUEUE_KEY) ?? [];
}

function writeQueue(queue: SyncMutation[]): void {
  setItem(QUEUE_KEY, queue);
  emit();
}

function isPermanentError(mutation: SyncMutation): boolean {
  return mutation.retries >= SYNC_MAX_RETRIES;
}

export function enqueue(
  mutation: Omit<SyncMutation, "id" | "createdAt" | "retries">,
): SyncMutation {
  const entry: SyncMutation = {
    ...mutation,
    id: generateMutationId(),
    createdAt: new Date().toISOString(),
    retries: 0,
  };

  const queue = readQueue();
  queue.push(entry);
  writeQueue(queue);
  return entry;
}

export function peek(): SyncMutation | null {
  const queue = readQueue();
  return queue[0] ?? null;
}

export function dequeue(id: string): void {
  const queue = readQueue().filter((mutation) => mutation.id !== id);
  writeQueue(queue);
}

export function getAll(): SyncMutation[] {
  return readQueue();
}

export function getPendingCount(): number {
  return readQueue().filter((mutation) => !isPermanentError(mutation)).length;
}

export function markRetry(id: string, error: string): void {
  const queue = readQueue().map((mutation) => {
    if (mutation.id !== id) {
      return mutation;
    }

    return {
      ...mutation,
      retries: mutation.retries + 1,
      lastError: error,
    };
  });

  writeQueue(queue);
}

export function resetRetries(id: string): void {
  const queue = readQueue().map((mutation) => {
    if (mutation.id !== id) {
      return mutation;
    }

    return {
      ...mutation,
      retries: 0,
      lastError: undefined,
    };
  });

  writeQueue(queue);
}

export function remapEntityId(
  entity: SyncEntity,
  oldId: string | number,
  newId: string | number,
): void {
  const queue = readQueue().map((mutation) => {
    if (mutation.entity !== entity || mutation.entityId !== oldId) {
      return mutation;
    }

    return {
      ...mutation,
      entityId: newId,
    };
  });

  writeQueue(queue);
}

export function updateMutationPayload(id: string, payload: unknown): void {
  const queue = readQueue().map((mutation) => {
    if (mutation.id !== id) {
      return mutation;
    }

    return {
      ...mutation,
      payload,
    };
  });

  writeQueue(queue);
}

export function findPendingMutation(
  entity: SyncEntity,
  entityId: string | number,
  operation: SyncMutation["operation"],
): SyncMutation | undefined {
  return readQueue().find(
    (mutation) =>
      mutation.entity === entity &&
      mutation.entityId === entityId &&
      mutation.operation === operation,
  );
}

export function remapPayloadCategoryId(oldId: string, newId: string): void {
  const queue = readQueue().map((mutation) => {
    if (mutation.entity !== "menuCatalog") {
      return mutation;
    }

    const payload = mutation.payload as { categoryId?: string };
    if (payload.categoryId !== oldId) {
      return mutation;
    }

    return {
      ...mutation,
      payload: { ...payload, categoryId: newId },
    };
  });

  writeQueue(queue);
}

export function remapPayloadProductId(oldId: string, newId: string): void {
  const queue = readQueue().map((mutation) => {
    if (mutation.entity !== "tables") {
      return mutation;
    }

    const payload = mutation.payload as { productId?: string };
    if (payload.productId !== oldId) {
      return mutation;
    }

    return {
      ...mutation,
      payload: { ...payload, productId: newId },
    };
  });

  writeQueue(queue);
}

export function removeMutationsForEntityId(
  entity: SyncEntity,
  entityId: string | number,
): void {
  const queue = readQueue().filter(
    (mutation) => !(mutation.entity === entity && mutation.entityId === entityId),
  );
  writeQueue(queue);
}

export function resetAllFailedRetries(): void {
  const queue = readQueue().map((mutation) => {
    if (!isPermanentError(mutation)) {
      return mutation;
    }

    return {
      ...mutation,
      retries: 0,
      lastError: undefined,
    };
  });

  writeQueue(queue);
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): SyncMutation[] {
  return readQueue();
}

export function getServerSnapshot(): SyncMutation[] {
  return serverSnapshot;
}

export const syncQueue = {
  enqueue,
  peek,
  dequeue,
  getAll,
  getPendingCount,
  markRetry,
  resetRetries,
  remapEntityId,
  remapPayloadCategoryId,
  remapPayloadProductId,
  updateMutationPayload,
  findPendingMutation,
  removeMutationsForEntityId,
  resetAllFailedRetries,
  subscribe,
  getSnapshot,
  getServerSnapshot,
};

export type { SyncEntity };
