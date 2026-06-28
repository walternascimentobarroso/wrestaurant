"use client";

import Link from "next/link";
import { AlertTriangle, ListChecks } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useChecklistProgressSummary } from "../hooks/useDailyChecklist";

interface ChecklistIncompleteBannerProps {
  className?: string;
}

export function ChecklistIncompleteBanner({ className }: ChecklistIncompleteBannerProps) {
  const { hasIncompleteOpening, opening } = useChecklistProgressSummary();

  if (!hasIncompleteOpening) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3",
        className,
      )}
    >
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">Abertura incompleta</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Faltam {opening.progress.total - opening.progress.completed} itens de abertura (
          {opening.progress.completed}/{opening.progress.total}). O app continua disponível, mas
          conclua a checklist quando possível.
        </p>
      </div>
      <Link
        href="/checklists"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0 rounded-xl")}
      >
        Ver checklist
      </Link>
    </div>
  );
}

interface ChecklistHeaderButtonProps {
  className?: string;
}

export function ChecklistHeaderButton({ className }: ChecklistHeaderButtonProps) {
  const { opening, hasIncompleteOpening } = useChecklistProgressSummary();

  return (
    <Link
      href="/checklists"
      aria-label="Checklists operacionais"
      className={cn(
        buttonVariants({ variant: "outline", size: "icon-lg" }),
        "relative size-12 rounded-2xl shadow-pressed hover:-translate-y-px hover:shadow-elevated active:translate-y-px active:shadow-pressed",
        hasIncompleteOpening && "border-amber-500/40",
        className,
      )}
    >
      <ListChecks className="size-5" />
      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-card px-1.5 py-0.5 text-[10px] font-semibold leading-none text-muted-foreground shadow-sm ring-1 ring-border">
        {opening.progress.completed}/{opening.progress.total}
      </span>
    </Link>
  );
}
