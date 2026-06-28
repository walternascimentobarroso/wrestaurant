"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

import type { ResolvedChecklistItem } from "../types";

interface ChecklistItemRowProps {
  entry: ResolvedChecklistItem;
  onToggle: (itemId: string) => void;
  readOnly?: boolean;
}

function formatCompletedTime(completedAt: string): string {
  return new Date(completedAt).toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ChecklistItemRow({ entry, onToggle, readOnly = false }: ChecklistItemRowProps) {
  const { item, completed } = entry;

  function handleToggle() {
    if (!readOnly) {
      onToggle(item.id);
    }
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border px-4 py-3 transition-colors",
        completed
          ? "border-primary/20 bg-primary/5"
          : "border-border bg-card hover:bg-muted/40",
        !readOnly && "cursor-pointer",
      )}
      onClick={readOnly ? undefined : handleToggle}
      onMouseDown={
        readOnly
          ? undefined
          : (event) => {
              event.preventDefault();
            }
      }
      onKeyDown={
        readOnly
          ? undefined
          : (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleToggle();
              }
            }
      }
      role={readOnly ? undefined : "button"}
      tabIndex={readOnly ? undefined : 0}
    >
      <span
        aria-hidden
        className={cn(
          "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg border-2 transition-colors",
          completed
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground/30 bg-background",
        )}
      >
        {completed ? <Check className="size-3.5" strokeWidth={3} /> : null}
      </span>

      <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
        <span
          className={cn(
            "text-sm font-medium leading-snug text-foreground",
            completed && "text-muted-foreground line-through",
          )}
        >
          {item.label}
        </span>

        {completed && entry.completedAt ? (
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {formatCompletedTime(entry.completedAt)}
          </span>
        ) : null}
      </div>
    </div>
  );
}
