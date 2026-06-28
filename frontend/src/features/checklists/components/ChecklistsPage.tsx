"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ListChecks } from "lucide-react";

import { AppHeaderActions } from "@/components/app-header-actions";
import { buttonVariants } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { brand } from "@/design-system";
import {
  formatReportDate,
  parseLocalDateKey,
} from "@/features/sales/utils/formatReportDate";
import { cn } from "@/lib/utils";

import { useDailyChecklist } from "../hooks/useDailyChecklist";
import type { ChecklistType } from "../types";
import { CHECKLIST_TYPE_LABELS } from "../types";
import {
  ChecklistItemsGroup,
  ChecklistTimeWindowBadge,
} from "./ChecklistItemsGroup";
import { ChecklistProgressBar } from "./ChecklistProgressBar";

export function ChecklistsPage() {
  const { opening, closing, getView, toggleItem, dateKey } = useDailyChecklist();
  const [activeType, setActiveType] = useState<ChecklistType>("opening");

  const view = getView(activeType);
  const parsedDate = parseLocalDateKey(dateKey);

  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="shrink-0 border-b border-border bg-card shadow-elevated">
        <div className="flex items-start justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <Link
                href="/"
                aria-label="Voltar para mesas"
                className={cn(
                  buttonVariants({ variant: "outline", size: "icon-sm" }),
                  "rounded-xl",
                )}
              >
                <ArrowLeft className="size-4" />
              </Link>
              <p className="font-heading text-xs font-semibold uppercase tracking-wide text-primary">
                {brand}
              </p>
            </div>
            <h1 className="font-heading text-xl font-bold text-foreground">Checklists</h1>
            <p className="mt-1 text-sm capitalize text-muted-foreground">
              {parsedDate ? formatReportDate(parsedDate) : dateKey}
            </p>
          </div>
          <AppHeaderActions hideChecklistButton />
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4">
        <div className="mx-auto max-w-2xl space-y-4">
          <ToggleGroup
            value={[activeType]}
            onValueChange={(value) => {
              const next = value[0];
              if (next === "opening" || next === "closing") {
                setActiveType(next);
              }
            }}
            variant="outline"
            className="grid w-full grid-cols-2 rounded-2xl border border-border bg-card p-1"
          >
            {(["opening", "closing"] as const).map((type) => {
              const typeView = type === "opening" ? opening : closing;
              const isActive = activeType === type;

              return (
                <ToggleGroupItem
                  key={type}
                  value={type}
                  className={cn(
                    "h-auto min-h-14 cursor-pointer flex-col gap-1 rounded-xl border-2 px-3 py-3 transition-all",
                    "border-transparent bg-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    "data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-elevated data-[state=on]:hover:bg-primary/90",
                    isActive &&
                      "border-primary bg-primary text-primary-foreground shadow-elevated",
                  )}
                >
                  <span
                    className={cn(
                      "flex items-center gap-2 font-heading text-sm font-semibold",
                      isActive && "text-primary-foreground",
                    )}
                  >
                    <ListChecks className="size-4" />
                    {CHECKLIST_TYPE_LABELS[type]}
                  </span>
                  <span
                    className={cn(
                      "text-xs tabular-nums",
                      isActive ? "text-primary-foreground/75" : "text-muted-foreground",
                    )}
                  >
                    {typeView.progress.completed}/{typeView.progress.total}
                  </span>
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>

          <section className="space-y-4 rounded-3xl border border-border bg-card p-5 shadow-elevated">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-heading text-lg font-semibold text-foreground">
                  {CHECKLIST_TYPE_LABELS[activeType]}
                </h2>
                {view.template ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Janela sugerida: {view.timeWindowLabel}
                  </p>
                ) : null}
              </div>
              {view.template ? (
                <ChecklistTimeWindowBadge
                  label={view.timeWindowLabel}
                  status={view.timeWindowStatus}
                />
              ) : null}
            </div>

            <ChecklistProgressBar progress={view.progress} />

            {view.items.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                Nenhum item configurado para esta checklist.
              </p>
            ) : (
              <div className="space-y-6">
                <ChecklistItemsGroup
                  title="Itens do dia"
                  items={view.grouped.general}
                  onToggle={(itemId) => toggleItem(itemId)}
                />
                <ChecklistItemsGroup
                  title="Específicos de hoje"
                  items={view.grouped.specific}
                  onToggle={(itemId) => toggleItem(itemId)}
                />
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
