"use client";

import { cn } from "@/lib/utils";

import type { ChecklistProgress } from "../types";

interface ChecklistProgressBarProps {
  progress: ChecklistProgress;
  className?: string;
}

export function ChecklistProgressBar({ progress, className }: ChecklistProgressBarProps) {
  const percentage =
    progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-foreground">
          {progress.completed}/{progress.total} concluídos
        </span>
        <span className="text-muted-foreground">{percentage}%</span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            progress.isComplete ? "bg-primary" : "bg-primary/70",
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
