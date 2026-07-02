"use client";

import Link from "next/link";
import { ArrowLeft, Banknote, ClipboardList, CreditCard, Receipt } from "lucide-react";

import { AppHeaderActions } from "@/components/app-header-actions";
import { buttonVariants } from "@/components/ui/button";
import { brand } from "@/design-system";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { cn } from "@/lib/utils";

import { DailyReportPanel } from "./DailyReportPanel";
import { useSales } from "../hooks/useSales";
import { formatReportDate } from "../utils/formatReportDate";

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

export function DailyReportPage() {
  const { dailySales, dailyTotal, dailySalesCount } = useSales();
  const { formatCurrency } = useSettings();

  const cashTotal = dailySales
    .filter((sale) => sale.paymentMethod === "cash")
    .reduce((sum, sale) => sum + sale.total, 0);
  const cardTotal = dailySales
    .filter((sale) => sale.paymentMethod === "card")
    .reduce((sum, sale) => sum + sale.total, 0);
  const cashCount = dailySales.filter((sale) => sale.paymentMethod === "cash").length;
  const cardCount = dailySales.filter((sale) => sale.paymentMethod === "card").length;

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
          <section
            aria-label="Resumo do dia"
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            <StatCard
              label="Total do dia"
              value={formatCurrency(dailyTotal)}
              detail={
                dailySalesCount === 1
                  ? "1 venda registrada"
                  : `${dailySalesCount} vendas registradas`
              }
              icon={Receipt}
            />
            <StatCard
              label="Vendas"
              value={String(dailySalesCount)}
              detail={dailySalesCount === 1 ? "registrada hoje" : "registradas hoje"}
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

          <section aria-label="Detalhes das vendas">
            <DailyReportPanel sales={dailySales} showSummary={false} layout="page" />
          </section>
        </div>
      </main>
    </div>
  );
}
