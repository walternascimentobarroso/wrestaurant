"use client";

import { useState } from "react";

import { useSettings } from "@/features/settings/hooks/useSettings";

import { DailyReportTabs } from "./DailyReportTabs";
import { DailySalesChart } from "./DailySalesChart";
import type { Sale } from "../types";
import { formatSaleTime } from "../utils/formatReportDate";

const PAYMENT_LABELS = {
  cash: "Dinheiro",
  card: "Cartão",
} as const;

interface DailyReportPanelProps {
  sales: Sale[];
  showTabs?: boolean;
  showSummary?: boolean;
}

export function DailyReportPanel({
  sales,
  showTabs = true,
  showSummary = true,
}: DailyReportPanelProps) {
  const { formatCurrency } = useSettings();
  const [view, setView] = useState<"list" | "chart">("list");
  const total = sales.reduce((sum, sale) => sum + sale.total, 0);

  return (
    <div className="space-y-4">
      {showTabs ? <DailyReportTabs view={view} onViewChange={setView} /> : null}

      {view === "list" ? (
        sales.length === 0 ? (
          <div className="flex min-h-32 items-center justify-center px-4">
            <p className="text-center text-muted-foreground">
              Nenhuma venda registrada neste dia.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {sales.map((sale) => (
              <li
                key={sale.id}
                className="rounded-2xl border border-border bg-card p-4 shadow-pressed"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-heading text-lg font-bold text-foreground">
                      {formatSaleTime(sale.paidAt)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Mesa {sale.tableNumber} · {PAYMENT_LABELS[sale.paymentMethod]}
                    </p>
                  </div>
                  <p className="shrink-0 font-heading text-lg font-bold text-primary">
                    {formatCurrency(sale.total)}
                  </p>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-foreground">
                  {sale.description}
                </p>
              </li>
            ))}
          </ul>
        )
      ) : (
        <DailySalesChart sales={sales} />
      )}

      {showSummary ? (
        <div className="rounded-2xl border border-border bg-muted/50 px-4 py-4">
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold text-foreground">Total do dia</span>
            <span className="font-heading text-xl font-bold text-primary">
              {formatCurrency(total)}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {sales.length} {sales.length === 1 ? "venda" : "vendas"}
          </p>
        </div>
      ) : null}
    </div>
  );
}
