import {
  isOnline,
  processQueue,
  SYNC_MAX_RETRIES,
  syncEngine,
  syncQueue,
  type SyncEntity,
} from "@/lib/offline";

let cleanup: (() => void) | null = null;

export function initSync(): () => void {
  if (cleanup) {
    return cleanup;
  }

  cleanup = syncEngine.start();
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

export async function hydrateFromServer(
  _entity: SyncEntity,
  fetcher: () => Promise<unknown>,
): Promise<void> {
  await fetcher();
}
