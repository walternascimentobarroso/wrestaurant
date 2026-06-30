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
  resetAllFailedRetries,
  subscribe,
  getSnapshot,
  getServerSnapshot,
};

export type { SyncEntity };
