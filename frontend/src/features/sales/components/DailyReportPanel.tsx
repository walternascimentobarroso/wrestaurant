"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useSettings } from "@/features/settings/hooks/useSettings";

import { DailyReportTabs } from "./DailyReportTabs";
import { DailySalesChart } from "./DailySalesChart";
import type { Sale } from "../types";
import { formatSaleSessionTime, formatSessionDurationMinutes } from "../utils/formatReportDate";

const PAYMENT_LABELS = {
  cash: "Dinheiro",
  card: "Cartão",
} as const;

interface DailyReportPanelProps {
  sales: Sale[];
  showTabs?: boolean;
  showSummary?: boolean;
  layout?: "default" | "page";
  editable?: boolean;
  onEdit?: (sale: Sale) => void;
  onDelete?: (sale: Sale) => void;
}

export function DailyReportPanel({
  sales,
  showTabs = true,
  showSummary = true,
  layout = "default",
  editable = false,
  onEdit,
  onDelete,
}: DailyReportPanelProps) {
  const { formatCurrency } = useSettings();
  const [view, setView] = useState<"list" | "chart">("list");
  const total = sales.reduce((sum, sale) => sum + sale.total, 0);

  const isPageLayout = layout === "page";

  return (
    <div className="space-y-4">
      {showTabs ? (
        <DailyReportTabs
          view={view}
          onViewChange={setView}
          className={isPageLayout ? "mt-0" : undefined}
        />
      ) : null}

      {view === "list" ? (
        sales.length === 0 ? (
          <div className="flex min-h-32 items-center justify-center px-4">
            <p className="text-center text-muted-foreground">
              Nenhuma venda registrada neste dia.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {sales.map((sale) => {
              const duration =
                sale.openedAt &&
                formatSessionDurationMinutes(sale.openedAt, sale.paidAt);

              return (
              <li
                key={sale.id}
                className="rounded-2xl border border-border bg-card p-4 shadow-pressed"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-heading text-lg font-bold text-foreground">
                      {formatSaleSessionTime(sale)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Mesa {sale.tableNumber} · {PAYMENT_LABELS[sale.paymentMethod]}
                      {duration ? ` · ${duration}` : ""}
                    </p>
                    {sale.adjustmentReason ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Correção: {sale.adjustmentReason}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-start gap-2">
                    {editable ? (
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => onEdit?.(sale)}
                          aria-label="Editar venda"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => onDelete?.(sale)}
                          aria-label="Excluir venda"
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    ) : null}
                    <p className="font-heading text-lg font-bold text-primary">
                      {formatCurrency(sale.total)}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-foreground">
                  {sale.description}
                </p>
              </li>
              );
            })}
          </ul>
        )
      ) : (
        <DailySalesChart sales={sales} size={isPageLayout ? "full" : "compact"} />
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
