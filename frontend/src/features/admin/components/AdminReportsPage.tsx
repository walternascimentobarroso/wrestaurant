"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { DailyReportPanel } from "@/features/sales/components/DailyReportPanel";
import { DailyReportSummaryCards } from "@/features/sales/components/DailyReportSummaryCards";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { useSales } from "@/features/sales/hooks/useSales";
import {
  formatReportDate,
  getLocalDateKey,
} from "@/features/sales/utils/formatReportDate";

export function AdminReportsPage() {
  const { formatCurrency } = useSettings();
  const {
    salesByDay,
    allTimeTotal,
    allSalesCount,
    dailySales,
    dailyTotal,
    dailySalesCount,
  } = useSales();

  const todayKey = getLocalDateKey(new Date().toISOString());
  const pastDays = salesByDay.filter((group) => group.dateKey !== todayKey);

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b border-border bg-card px-6 py-4">
        <h2 className="font-heading text-xl font-bold text-foreground">Relatórios</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Acompanhe as vendas do dia e consulte o histórico.
        </p>
      </header>

      <div className="flex-1 space-y-8 overflow-y-auto px-6 py-6 sm:px-8">
        <section aria-label="Visão geral">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-elevated">
              <p className="text-sm text-muted-foreground">Total geral</p>
              <p className="mt-1 font-heading text-2xl font-bold text-primary">
                {formatCurrency(allTimeTotal)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {allSalesCount} {allSalesCount === 1 ? "venda" : "vendas"}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 shadow-elevated">
              <p className="text-sm text-muted-foreground">Total de hoje</p>
              <p className="mt-1 font-heading text-2xl font-bold text-foreground">
                {formatCurrency(dailyTotal)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {dailySalesCount} {dailySalesCount === 1 ? "venda" : "vendas"}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 shadow-elevated">
              <p className="text-sm text-muted-foreground">Dias com vendas</p>
              <p className="mt-1 font-heading text-2xl font-bold text-foreground">
                {salesByDay.length}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {salesByDay.length === 1 ? "relatório disponível" : "relatórios disponíveis"}
              </p>
            </div>
          </div>
        </section>

        <section aria-label="Relatório de hoje" className="space-y-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h3 className="font-heading text-lg font-semibold text-foreground">
                Hoje
              </h3>
              <p className="mt-1 text-sm capitalize text-muted-foreground">
                {formatReportDate(new Date())}
              </p>
            </div>
            {dailySalesCount > 0 ? (
              <Link
                href={`/admin/relatorios/${todayKey}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                Ver em tela cheia
              </Link>
            ) : null}
          </div>

          {dailySalesCount === 0 ? (
            <div className="flex min-h-32 items-center justify-center rounded-2xl border border-dashed border-border px-6 py-10">
              <p className="text-center text-muted-foreground">
                Nenhuma venda registrada hoje. As vendas aparecerão aqui após receber
                pagamentos nas mesas.
              </p>
            </div>
          ) : (
            <>
              <DailyReportSummaryCards
                sales={dailySales}
                countDetail={(count) =>
                  count === 1 ? "1 venda registrada hoje" : `${count} vendas registradas hoje`
                }
              />
              <DailyReportPanel sales={dailySales} showSummary={false} layout="page" />
            </>
          )}
        </section>

        {pastDays.length > 0 ? (
          <section aria-label="Histórico de relatórios">
            <h3 className="mb-4 font-heading text-lg font-semibold text-foreground">
              Histórico
            </h3>
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
              <ul className="divide-y divide-border">
                {pastDays.map((group) => (
                  <li key={group.dateKey}>
                    <Link
                      href={`/admin/relatorios/${group.dateKey}`}
                      className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/50"
                    >
                      <div className="min-w-0">
                        <p className="font-heading text-base font-semibold capitalize text-foreground">
                          {formatReportDate(group.date)}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {group.sales.length}{" "}
                          {group.sales.length === 1 ? "venda" : "vendas"}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        <span className="font-heading text-lg font-bold text-primary">
                          {formatCurrency(group.total)}
                        </span>
                        <ChevronRight className="size-5 text-muted-foreground" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : salesByDay.length === 0 ? (
          <div className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-border px-6 py-10">
            <p className="text-center text-muted-foreground">
              Nenhum relatório disponível. As vendas aparecerão aqui após receber pagamentos
              nas mesas.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
