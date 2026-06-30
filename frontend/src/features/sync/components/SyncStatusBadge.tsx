"use client";

import { useState } from "react";

import { useSyncStatus } from "../hooks/useSyncStatus";
import { SyncErrorsDialog } from "./SyncErrorsDialog";

export function SyncStatusBadge() {
  const {
    online,
    pendingCount,
    errorCount,
    errors,
    retry,
    retryAll,
    discard,
  } = useSyncStatus();

  const [dialogOpen, setDialogOpen] = useState(false);

  let label = "Sincronizado";
  let className =
    "fixed bottom-3 right-3 z-50 cursor-default rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 shadow-sm";

  if (!online) {
    label = "Offline";
    className =
      "fixed bottom-3 right-3 z-50 cursor-default rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 shadow-sm";
  } else if (errorCount > 0) {
    label = "Erro de sync";
    className =
      "fixed bottom-3 right-3 z-50 cursor-pointer rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-800 shadow-sm hover:bg-red-100";
  } else if (pendingCount > 0) {
    label = `${pendingCount} pendente${pendingCount > 1 ? "s" : ""}`;
    className =
      "fixed bottom-3 right-3 z-50 cursor-default rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900 shadow-sm";
  }

  const isClickable = errorCount > 0;

  const content = (
    <>
      {label}
    </>
  );

  return (
    <>
      {isClickable ? (
        <button
          type="button"
          className={className}
          role="status"
          aria-live="polite"
          title="Status de sincronização"
          onClick={() => setDialogOpen(true)}
        >
          {content}
        </button>
      ) : (
        <div
          className={className}
          role="status"
          aria-live="polite"
          title="Status de sincronização"
        >
          {content}
        </div>
      )}

      <SyncErrorsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        errors={errors}
        onRetry={retry}
        onRetryAll={retryAll}
        onDiscard={discard}
      />
    </>
  );
}
