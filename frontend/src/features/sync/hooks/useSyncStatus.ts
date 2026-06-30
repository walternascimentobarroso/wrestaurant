"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
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

interface SyncStatusState {
  mutations: SyncMutation[];
  online: boolean;
}

function readSyncStatus(): SyncStatusState {
  return {
    mutations: syncQueue.getAll(),
    online: getConnectivitySnapshot(),
  };
}

function countPending(mutations: SyncMutation[]): number {
  return mutations.filter((mutation) => mutation.retries < SYNC_MAX_RETRIES).length;
}

function getFailedMutations(mutations: SyncMutation[]): SyncMutation[] {
  return mutations.filter((mutation) => mutation.retries >= SYNC_MAX_RETRIES);
}

export function useSyncStatus() {
  const [status, setStatus] = useState(readSyncStatus);

  useEffect(() => {
    const sync = () => {
      setStatus((previous) => {
        const next = readSyncStatus();
        if (
          previous.online === next.online &&
          previous.mutations === next.mutations
        ) {
          return previous;
        }
        return next;
      });
    };

    const unsubQueue = syncQueue.subscribe(sync);
    const unsubOnline = subscribeConnectivity(sync);

    return () => {
      unsubQueue();
      unsubOnline();
    };
  }, []);

  const { mutations, online } = status;

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
    pendingCount: countPending(mutations),
    errorCount: errors.length,
    errors,
    retry,
    retryAll,
    discard,
  };
}
