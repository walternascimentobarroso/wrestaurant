"use client";

import { ClipboardList } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { useSales } from "@/features/sales/hooks/useSales";

const PAYMENT_LABELS = {
  cash: "Dinheiro",
  card: "Cartão",
} as const;

function formatSaleTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatReportDate(date = new Date()): string {
  return date.toLocaleDateString("pt-PT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function DailyReportButton() {
  const { formatCurrency } = useSettings();
  const { dailySales, dailyTotal } = useSales();

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            className="size-12 rounded-2xl shadow-pressed hover:-translate-y-px hover:shadow-elevated active:translate-y-px active:shadow-pressed"
            aria-label="Relatório do dia"
          />
        }
      >
        <ClipboardList className="size-5" />
      </DialogTrigger>

      <DialogContent className="flex max-h-[85dvh] max-w-lg flex-col rounded-3xl p-0 sm:max-w-lg">
        <div className="shrink-0 border-b border-border px-6 py-5">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">
              Relatório do dia
            </DialogTitle>
            <DialogDescription className="capitalize">
              {formatReportDate()}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {dailySales.length === 0 ? (
            <div className="flex min-h-40 items-center justify-center px-4">
              <p className="text-center text-muted-foreground">
                Nenhuma venda registrada hoje.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {dailySales.map((sale) => (
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
                        Mesa {sale.tableNumber} ·{" "}
                        {PAYMENT_LABELS[sale.paymentMethod]}
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
          )}
        </div>

        <div className="shrink-0 border-t border-border bg-muted/50 px-6 py-5">
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold text-foreground">
              Total do dia
            </span>
            <span className="font-heading text-2xl font-bold text-primary">
              {formatCurrency(dailyTotal)}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {dailySales.length}{" "}
            {dailySales.length === 1 ? "venda" : "vendas"}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
