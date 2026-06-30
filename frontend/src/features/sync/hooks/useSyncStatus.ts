"use client";

import { useCallback, useSyncExternalStore } from "react";

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

function countPending(mutations: SyncMutation[]): number {
  return mutations.filter((mutation) => mutation.retries < SYNC_MAX_RETRIES).length;
}

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

  const errors = getFailedMutations(mutations);

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
    pendingCount: countPending(mutations),
    errorCount: errors.length,
    errors,
    retry,
    retryAll,
    discard,
  };
}
