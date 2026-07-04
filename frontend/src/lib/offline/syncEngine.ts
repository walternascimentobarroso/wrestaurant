import { ApiError } from "@/lib/api";
import {
  formatAuthSyncError,
  isAuthApiError,
  SESSION_EXPIRED_MESSAGE,
} from "@/lib/authErrors";
import { isOnline } from "./connectivity";
import { isTempId } from "./idGenerator";
import * as syncQueueModule from "./syncQueue";
import {
  SYNC_BACKOFF_MS,
  SYNC_MAX_RETRIES,
  type SyncEntity,
  type SyncHandler,
  type SyncMutation,
} from "./types";

const handlers = new Map<SyncEntity, SyncHandler>();
const lastAttemptAt = new Map<string, number>();

let stopFn: (() => void) | null = null;
let chain: Promise<void> = Promise.resolve();
let running = false;
let onAuthError: (() => void) | null = null;

export function setSyncAuthErrorHandler(handler: (() => void) | null): void {
  onAuthError = handler;
}

function resolveSyncError(error: unknown): string {
  if (error instanceof ApiError && isAuthApiError(error.status)) {
    return SESSION_EXPIRED_MESSAGE;
  }
  if (error instanceof Error) {
    return formatAuthSyncError(error.message);
  }
  return "Erro desconhecido";
}

function isAuthenticationFailure(error: unknown): boolean {
  if (error instanceof ApiError && isAuthApiError(error.status)) {
    return true;
  }
  if (error instanceof Error) {
    return /token inválido|não autenticado/i.test(error.message);
  }
  return false;
}

function getBackoffDelay(retries: number): number {
  const index = Math.min(retries, SYNC_BACKOFF_MS.length - 1);
  return SYNC_BACKOFF_MS[index];
}

function isPermanentError(mutation: SyncMutation): boolean {
  return mutation.retries >= SYNC_MAX_RETRIES;
}

function canProcess(mutation: SyncMutation): boolean {
  if (isPermanentError(mutation)) {
    return false;
  }

  if (mutation.retries === 0) {
    return true;
  }

  const lastAttempt = lastAttemptAt.get(mutation.id) ?? 0;
  const delay = getBackoffDelay(mutation.retries - 1);
  return Date.now() - lastAttempt >= delay;
}

function hasUnresolvedRecipeIngredients(mutation: SyncMutation): boolean {
  if (mutation.entity !== "products") {
    return false;
  }

  const recipe = (
    mutation.payload as { recipe?: Array<{ ingredientId?: string }> }
  ).recipe;
  if (!recipe?.length) {
    return false;
  }

  return recipe.some(
    (line) => line.ingredientId !== undefined && isTempId(line.ingredientId),
  );
}

function isIngredientCreateMutation(mutation: SyncMutation): boolean {
  if (mutation.entity !== "products" || mutation.operation !== "create") {
    return false;
  }

  return (mutation.payload as { kind?: string }).kind === "ingredient";
}

function findNextProcessable(queue: SyncMutation[]): SyncMutation | null {
  for (const mutation of queue) {
    if (isPermanentError(mutation) || !canProcess(mutation)) {
      continue;
    }
    if (hasUnresolvedRecipeIngredients(mutation) && !isIngredientCreateMutation(mutation)) {
      continue;
    }
    return mutation;
  }

  for (const mutation of queue) {
    if (!isPermanentError(mutation) && canProcess(mutation)) {
      return mutation;
    }
  }

  return null;
}

async function processQueueInternal(): Promise<void> {
  if (typeof window === "undefined" || !isOnline() || running) {
    return;
  }

  running = true;

  try {
    while (isOnline()) {
      const queue = syncQueueModule.getAll();
      const mutation = findNextProcessable(queue);

      if (!mutation) {
        break;
      }

      const handler = handlers.get(mutation.entity);
      if (!handler) {
        break;
      }

      lastAttemptAt.set(mutation.id, Date.now());

      try {
        await handler(mutation);
        syncQueueModule.dequeue(mutation.id);
        lastAttemptAt.delete(mutation.id);
      } catch (error) {
        const message = resolveSyncError(error);

        if (isAuthenticationFailure(error)) {
          syncQueueModule.markAuthFailure(mutation.id, message);
          onAuthError?.();
          break;
        }

        syncQueueModule.markRetry(mutation.id, message);

        const updated = syncQueueModule
          .getAll()
          .find((item) => item.id === mutation.id);

        if (updated && isPermanentError(updated)) {
          continue;
        }

        const delay = getBackoffDelay(mutation.retries);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  } finally {
    running = false;
  }
}

export function registerHandler(
  entity: SyncEntity,
  handler: SyncHandler,
): void {
  handlers.set(entity, handler);
}

export function processQueue(): Promise<void> {
  chain = chain
    .then(() => processQueueInternal())
    .catch(() => undefined);
  return chain;
}

export function startSyncEngine(): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleOnline = (): void => {
    void processQueue();
  };

  const handleVisibility = (): void => {
    if (document.visibilityState === "visible") {
      void processQueue();
    }
  };

  window.addEventListener("online", handleOnline);
  document.addEventListener("visibilitychange", handleVisibility);

  void processQueue();

  return () => {
    window.removeEventListener("online", handleOnline);
    document.removeEventListener("visibilitychange", handleVisibility);
  };
}

export const syncEngine = {
  registerHandler,
  start(): () => void {
    stopFn?.();
    stopFn = startSyncEngine();
    return stopFn;
  },
  stop(): void {
    stopFn?.();
    stopFn = null;
  },
  flush: processQueue,
};
