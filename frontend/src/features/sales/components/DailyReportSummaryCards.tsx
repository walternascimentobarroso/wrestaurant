"use client";

import { Banknote, ClipboardList, CreditCard, Receipt } from "lucide-react";

import { useSettings } from "@/features/settings/hooks/useSettings";

import type { Sale } from "../types";
import { getPaymentStats } from "../utils/getPaymentStats";

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail?: string;
  icon: typeof Receipt;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-pressed">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 font-heading text-2xl font-bold text-foreground">{value}</p>
          {detail ? (
            <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
          ) : null}
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" aria-hidden />
        </div>
      </div>
    </div>
  );
}

interface DailyReportSummaryCardsProps {
  sales: Sale[];
  totalLabel?: string;
  countDetail?: (count: number) => string;
}

export function DailyReportSummaryCards({
  sales,
  totalLabel = "Total do dia",
  countDetail,
}: DailyReportSummaryCardsProps) {
  const { formatCurrency } = useSettings();
  const { total, count, cashTotal, cardTotal, cashCount, cardCount } =
    getPaymentStats(sales);

  const salesCountDetail =
    countDetail?.(count) ??
    (count === 1 ? "1 venda registrada" : `${count} vendas registradas`);

  return (
    <section
      aria-label="Resumo do dia"
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      <StatCard
        label={totalLabel}
        value={formatCurrency(total)}
        detail={salesCountDetail}
        icon={Receipt}
      />
      <StatCard
        label="Vendas"
        value={String(count)}
        detail={count === 1 ? "registrada" : "registradas"}
        icon={ClipboardList}
      />
      <StatCard
        label="Dinheiro"
        value={formatCurrency(cashTotal)}
        detail={
          cashCount === 1 ? "1 pagamento em dinheiro" : `${cashCount} pagamentos em dinheiro`
        }
        icon={Banknote}
      />
      <StatCard
        label="Cartão"
        value={formatCurrency(cardTotal)}
        detail={
          cardCount === 1 ? "1 pagamento no cartão" : `${cardCount} pagamentos no cartão`
        }
        icon={CreditCard}
      />
    </section>
  );
}
