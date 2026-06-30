"use client";

import { useState } from "react";
import { CloudAlert, CloudCheck, CloudOff, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useSyncStatus } from "../hooks/useSyncStatus";
import { SyncErrorsDialog } from "./SyncErrorsDialog";

type SyncVisualState = "synced" | "offline" | "error" | "pending";

function resolveSyncState(
  online: boolean,
  errorCount: number,
  pendingCount: number,
): SyncVisualState {
  if (!online) {
    return "offline";
  }
  if (errorCount > 0) {
    return "error";
  }
  if (pendingCount > 0) {
    return "pending";
  }
  return "synced";
}

function getStatusLabel(
  state: SyncVisualState,
  pendingCount: number,
  errorCount: number,
): string {
  switch (state) {
    case "offline":
      return "Offline";
    case "error":
      return errorCount === 1 ? "1 erro de sync" : `${errorCount} erros de sync`;
    case "pending":
      return pendingCount === 1
        ? "1 pendente"
        : `${pendingCount} pendentes`;
    default:
      return "Sincronizado";
  }
}

interface SyncStatusBadgeProps {
  className?: string;
}

export function SyncStatusBadge({ className }: SyncStatusBadgeProps) {
  const {
    online,
    pendingCount,
    errorCount,
    pending,
    errors,
    queueCount,
    retry,
    retryAll,
    discard,
  } = useSyncStatus();

  const [dialogOpen, setDialogOpen] = useState(false);

  const state = resolveSyncState(online, errorCount, pendingCount);
  const label = getStatusLabel(state, pendingCount, errorCount);
  const isClickable = queueCount > 0;
  const badgeCount = state === "error" ? errorCount : pendingCount;

  const icon =
    state === "offline" ? (
      <CloudOff className="size-5" />
    ) : state === "error" ? (
      <CloudAlert className="size-5" />
    ) : state === "pending" ? (
      <Loader2 className="size-5 animate-spin" />
    ) : (
      <CloudCheck className="size-5" />
    );

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        className={cn(
          "relative size-12 rounded-2xl border-border bg-card shadow-elevated",
          state === "synced" &&
            "border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400",
          state === "offline" &&
            "border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400",
          state === "error" &&
            "border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30",
          state === "pending" &&
            "border-amber-200 text-amber-800 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/30",
          !isClickable && "cursor-default",
          className,
        )}
        role="status"
        aria-live="polite"
        aria-label={label}
        title={label}
        onClick={isClickable ? () => setDialogOpen(true) : undefined}
      >
        {icon}
        {badgeCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-card text-[10px] font-bold leading-none shadow-sm ring-1 ring-border">
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        ) : null}
      </Button>

      <SyncErrorsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        pending={pending}
        errors={errors}
        onRetry={retry}
        onRetryAll={retryAll}
        onDiscard={discard}
      />
    </>
  );
}
