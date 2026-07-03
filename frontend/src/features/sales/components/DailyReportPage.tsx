"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AppHeaderActions } from "@/components/app-header-actions";
import { buttonVariants } from "@/components/ui/button";
import { brand } from "@/design-system";
import { cn } from "@/lib/utils";

import { DailyReportPanel } from "./DailyReportPanel";
import { DailyReportSummaryCards } from "./DailyReportSummaryCards";
import { useSales } from "../hooks/useSales";
import { formatReportDate } from "../utils/formatReportDate";

export function DailyReportPage() {
  const { dailySales } = useSales();

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
            <h1 className="font-heading text-xl font-bold text-foreground">Relatório do dia</h1>
            <p className="mt-1 text-sm capitalize text-muted-foreground">
              {formatReportDate(new Date())}
            </p>
          </div>
          <AppHeaderActions hideChecklistButton />
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <DailyReportSummaryCards
            sales={dailySales}
            countDetail={(count) =>
              count === 1 ? "1 venda registrada hoje" : `${count} vendas registradas hoje`
            }
          />

          <section aria-label="Detalhes das vendas">
            <DailyReportPanel sales={dailySales} showSummary={false} layout="page" />
          </section>
        </div>
      </main>
    </div>
  );
}
