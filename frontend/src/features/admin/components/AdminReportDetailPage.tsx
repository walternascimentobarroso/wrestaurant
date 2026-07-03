"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { DailyReportPanel } from "@/features/sales/components/DailyReportPanel";
import { DailyReportSummaryCards } from "@/features/sales/components/DailyReportSummaryCards";
import { useSales } from "@/features/sales/hooks/useSales";
import {
  formatReportDate,
  parseLocalDateKey,
} from "@/features/sales/utils/formatReportDate";

interface AdminReportDetailPageProps {
  dateKey: string;
}

export function AdminReportDetailPage({ dateKey }: AdminReportDetailPageProps) {
  const { salesByDay } = useSales();
  const report = salesByDay.find((group) => group.dateKey === dateKey);
  const parsedDate = parseLocalDateKey(dateKey);

  if (!report || !parsedDate) {
    return (
      <div className="flex h-full flex-col">
        <header className="shrink-0 border-b border-border bg-card px-6 py-4">
          <Link
            href="/admin/relatorios"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Voltar aos relatórios
          </Link>
          <h2 className="mt-3 font-heading text-xl font-bold text-foreground">
            Relatório não encontrado
          </h2>
        </header>

        <div className="flex flex-1 items-center justify-center px-6">
          <p className="text-center text-muted-foreground">
            Não há vendas registradas para esta data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b border-border bg-card px-6 py-4">
        <Link
          href="/admin/relatorios"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Voltar aos relatórios
        </Link>
        <h2 className="mt-3 font-heading text-xl font-bold capitalize text-foreground">
          {formatReportDate(parsedDate)}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {report.sales.length}{" "}
          {report.sales.length === 1 ? "venda" : "vendas"} registradas
        </p>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
        <div className="space-y-6">
          <DailyReportSummaryCards sales={report.sales} />

          <section aria-label="Detalhes das vendas">
            <DailyReportPanel
              sales={report.sales}
              showSummary={false}
              layout="page"
            />
          </section>
        </div>
      </div>
    </div>
  );
}
