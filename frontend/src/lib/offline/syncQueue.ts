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
const EMPTY_QUEUE: SyncMutation[] = [];
const serverSnapshot: SyncMutation[] = EMPTY_QUEUE;
let cache: SyncMutation[] = EMPTY_QUEUE;
let loaded = false;
let version = 0;

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

function loadCache(): void {
  if (loaded || typeof window === "undefined") {
    return;
  }

  const stored = getItem<SyncMutation[]>(QUEUE_KEY);
  if (stored !== null) {
    cache = stored;
    version += 1;
  }
  loaded = true;
}

function readQueue(): SyncMutation[] {
  loadCache();
  return cache;
}

function writeQueue(queue: SyncMutation[]): void {
  const next = queue.length === 0 ? EMPTY_QUEUE : queue;
  if (next === cache) {
    return;
  }

  cache = next;
  loaded = true;
  version += 1;
  setItem(QUEUE_KEY, next);
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

  writeQueue([...readQueue(), entry]);
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

export function markAuthFailure(id: string, error: string): void {
  const queue = readQueue().map((mutation) => {
    if (mutation.id !== id) {
      return mutation;
    }

    return {
      ...mutation,
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
    if (mutation.entity === "tables") {
      const payload = mutation.payload as { productId?: string };
      if (payload.productId !== oldId) {
        return mutation;
      }

      return {
        ...mutation,
        payload: { ...payload, productId: newId },
      };
    }

    if (mutation.entity === "products") {
      const payload = mutation.payload as {
        recipe?: Array<{ ingredientId?: string }>;
      };
      if (!Array.isArray(payload.recipe)) {
        return mutation;
      }

      let changed = false;
      const recipe = payload.recipe.map((line) => {
        if (line.ingredientId !== oldId) {
          return line;
        }
        changed = true;
        return { ...line, ingredientId: newId };
      });

      if (!changed) {
        return mutation;
      }

      return {
        ...mutation,
        payload: { ...payload, recipe },
      };
    }

    return mutation;
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
  loadCache();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): SyncMutation[] {
  if (typeof window === "undefined") {
    return serverSnapshot;
  }
  loadCache();
  return cache;
}

export function getServerSnapshot(): SyncMutation[] {
  return serverSnapshot;
}

export function getVersionSnapshot(): number {
  loadCache();
  return version;
}

export function getVersionServerSnapshot(): number {
  return 0;
}

export const syncQueue = {
  enqueue,
  peek,
  dequeue,
  getAll,
  getPendingCount,
  markRetry,
  markAuthFailure,
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
  getVersionSnapshot,
  getVersionServerSnapshot,
};

export type { SyncEntity };
