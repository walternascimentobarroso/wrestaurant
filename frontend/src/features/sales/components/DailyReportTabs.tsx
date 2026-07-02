"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ReportView = "list" | "chart";

interface DailyReportTabsProps {
  view: ReportView;
  onViewChange: (view: ReportView) => void;
  className?: string;
}

export function DailyReportTabs({ view, onViewChange, className }: DailyReportTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Visualização do relatório"
      className={cn("mt-4 flex gap-2", className)}
    >
      <Button
        type="button"
        role="tab"
        aria-selected={view === "list"}
        variant={view === "list" ? "default" : "outline"}
        onClick={() => onViewChange("list")}
        className={cn(
          "h-11 flex-1 rounded-xl font-semibold",
          view !== "list" && "bg-card shadow-pressed",
        )}
      >
        Lista
      </Button>
      <Button
        type="button"
        role="tab"
        aria-selected={view === "chart"}
        variant={view === "chart" ? "default" : "outline"}
        onClick={() => onViewChange("chart")}
        className={cn(
          "h-11 flex-1 rounded-xl font-semibold",
          view !== "chart" && "bg-card shadow-pressed",
        )}
      >
        Gráfico
      </Button>
    </div>
  );
}
