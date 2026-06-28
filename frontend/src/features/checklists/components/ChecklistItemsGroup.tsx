"use client";

import { cn } from "@/lib/utils";

import type { ResolvedChecklistItem } from "../types";
import { ChecklistItemRow } from "./ChecklistItemRow";

interface ChecklistItemsGroupProps {
  title: string;
  items: ResolvedChecklistItem[];
  onToggle: (itemId: string) => void;
  readOnly?: boolean;
}

export function ChecklistItemsGroup({
  title,
  items,
  onToggle,
  readOnly = false,
}: ChecklistItemsGroupProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <h3 className="font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-2">
        {items.map((entry) => (
          <ChecklistItemRow
            key={entry.item.id}
            entry={entry}
            onToggle={onToggle}
            readOnly={readOnly}
          />
        ))}
      </div>
    </section>
  );
}

interface ChecklistTimeWindowBadgeProps {
  label: string;
  status: "before" | "within" | "after" | "complete";
}

export function ChecklistTimeWindowBadge({ label, status }: ChecklistTimeWindowBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        status === "complete" && "bg-primary/15 text-primary",
        status === "within" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
        status === "before" && "bg-amber-500/15 text-amber-700 dark:text-amber-400",
        status === "after" && "bg-amber-500/15 text-amber-700 dark:text-amber-400",
      )}
    >
      {status === "complete" ? "Concluída" : `Horário: ${label}`}
    </span>
  );
}
