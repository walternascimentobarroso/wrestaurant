"use client";

import { useCallback, useSyncExternalStore } from "react";

import {
  getConnectivityServerSnapshot,
  getConnectivitySnapshot,
  subscribeConnectivity,
  SYNC_MAX_RETRIES,
  syncQueue,
} from "@/lib/offline";

import { retryFailed } from "../services/syncService";

function countPending(mutations: ReturnType<typeof syncQueue.getSnapshot>): number {
  return mutations.filter((mutation) => mutation.retries < SYNC_MAX_RETRIES)
    .length;
}

function hasPermanentErrors(
  mutations: ReturnType<typeof syncQueue.getSnapshot>,
): boolean {
  return mutations.some((mutation) => mutation.retries >= SYNC_MAX_RETRIES);
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

  const retry = useCallback(() => {
    retryFailed();
  }, []);

  return {
    online,
    pendingCount: countPending(mutations),
    hasErrors: hasPermanentErrors(mutations),
    retry,
  };
}
