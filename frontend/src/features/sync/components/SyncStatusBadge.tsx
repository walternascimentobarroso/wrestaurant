"use client";

import { useSyncStatus } from "../hooks/useSyncStatus";

export function SyncStatusBadge() {
  const { online, pendingCount, hasErrors } = useSyncStatus();

  let label = "Online";
  let className =
    "fixed bottom-3 right-3 z-50 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 shadow-sm";

  if (!online) {
    label = "Offline";
    className =
      "fixed bottom-3 right-3 z-50 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 shadow-sm";
  } else if (hasErrors) {
    label = "Erro de sync";
    className =
      "fixed bottom-3 right-3 z-50 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-800 shadow-sm";
  } else if (pendingCount > 0) {
    label = `Online · ${pendingCount} pendente${pendingCount > 1 ? "s" : ""}`;
  }

  return (
    <div
      className={className}
      role="status"
      aria-live="polite"
      title="Status de sincronização"
    >
      {label}
    </div>
  );
}
