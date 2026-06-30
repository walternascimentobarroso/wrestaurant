"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

import {
  getConnectivityServerSnapshot,
  getConnectivitySnapshot,
  subscribeConnectivity,
  SYNC_MAX_RETRIES,
  syncQueue,
  type SyncMutation,
} from "@/lib/offline";

import {
  discardMutationById,
  retryFailed,
  retryMutationById,
} from "../services/syncService";

function getFailedMutations(mutations: SyncMutation[]): SyncMutation[] {
  return mutations.filter((mutation) => mutation.retries >= SYNC_MAX_RETRIES);
}

export function useSyncStatus() {
  const mutations = useSyncExternalStore(
    syncQueue.subscribe,
    syncQueue.getSnapshot,
    syncQueue.getServerSnapshot,
  );

  const online = useSyncExternalStore(
    subscribeConnectivity,
    getConnectivitySnapshot,
    getConnectivityServerSnapshot,
  );

  const pending = useMemo(
    () => mutations.filter((mutation) => mutation.retries < SYNC_MAX_RETRIES),
    [mutations],
  );

  const errors = useMemo(
    () => getFailedMutations(mutations),
    [mutations],
  );

  const retry = useCallback((mutationId: string) => {
    retryMutationById(mutationId);
  }, []);

  const retryAll = useCallback(() => {
    retryFailed();
  }, []);

  const discard = useCallback((mutationId: string) => {
    discardMutationById(mutationId);
  }, []);

  return {
    online,
    pendingCount: pending.length,
    errorCount: errors.length,
    pending,
    errors,
    queueCount: mutations.length,
    retry,
    retryAll,
    discard,
  };
}
