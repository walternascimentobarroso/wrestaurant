"use client";

import { useSettings } from "@/features/settings/hooks/useSettings";

import type { Sale } from "../types";
import {
  aggregateSalesByHour,
  findPeakHour,
} from "../utils/aggregateSalesByHour";

interface DailySalesChartProps {
  sales: Sale[];
}

function formatHourLabel(hour: number): string {
  return `${hour.toString().padStart(2, "0")}h`;
}

export function DailySalesChart({ sales }: DailySalesChartProps) {
  const { formatCurrency } = useSettings();
  const buckets = aggregateSalesByHour(sales);
  const peak = findPeakHour(buckets);
  const maxTotal = Math.max(...buckets.map((bucket) => bucket.total), 1);

  if (sales.length === 0) {
    return (
      <div className="flex min-h-48 items-center justify-center px-4">
        <p className="text-center text-muted-foreground">
          Nenhuma venda para exibir no gráfico.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {peak && peak.total > 0 && (
        <div className="rounded-2xl bg-primary/10 px-4 py-3 text-center">
          <p className="text-sm text-muted-foreground">Horário de pico (entrada)</p>
          <p className="font-heading text-xl font-bold text-primary">
            {formatHourLabel(peak.hour)} · {formatCurrency(peak.total)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {peak.count} {peak.count === 1 ? "venda" : "vendas"}
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-4 shadow-pressed">
        <p className="mb-4 text-sm font-semibold text-foreground">
          Movimento por horário (entrada)
        </p>

        <div className="flex h-44 items-end gap-1.5 sm:gap-2">
          {buckets.map((bucket) => {
            const heightPercent = (bucket.total / maxTotal) * 100;
            const isPeak = peak?.hour === bucket.hour && bucket.total > 0;

            return (
              <div
                key={bucket.hour}
                className="group/bar flex min-w-0 flex-1 flex-col items-center gap-2"
              >
                <div className="relative flex h-32 w-full items-end justify-center">
                  <div
                    role="presentation"
                    className="pointer-events-none absolute bottom-[calc(100%-0.25rem)] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1.5 text-xs font-semibold text-background opacity-0 shadow-elevated transition-opacity group-hover/bar:opacity-100 group-focus-within/bar:opacity-100"
                  >
                    {formatCurrency(bucket.total)}
                  </div>
                  <div
                    tabIndex={0}
                    aria-label={`${formatHourLabel(bucket.hour)}: ${formatCurrency(bucket.total)}`}
                    className={`w-full max-w-10 rounded-t-xl transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      isPeak ? "bg-primary shadow-elevated" : "bg-primary/50"
                    }`}
                    style={{
                      height: `${Math.max(heightPercent, bucket.total > 0 ? 8 : 2)}%`,
                    }}
                  />
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground sm:text-xs">
                  {formatHourLabel(bucket.hour)}
                </span>
                {bucket.count > 0 && (
                  <span className="text-[10px] text-primary sm:text-xs">
                    {formatCurrency(bucket.total)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Passe o mouse sobre as barras para ver o valor de cada horário
      </p>
    </div>
  );
}
