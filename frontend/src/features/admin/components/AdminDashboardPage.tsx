"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  FolderTree,
  LayoutGrid,
  Package,
  TrendingUp,
  Users,
  Warehouse,
} from "lucide-react";

import { DailySalesChart } from "@/features/sales/components/DailySalesChart";
import { useSales } from "@/features/sales/hooks/useSales";
import {
  formatReportDateShort,
  formatSaleSessionTime,
} from "@/features/sales/utils/formatReportDate";
import { useMenuCatalog } from "@/features/menu/hooks/useMenuCatalog";
import { useProducts } from "@/features/menu/hooks/useProducts";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { useStock } from "@/features/stock/hooks/useStock";
import { isLowStock, isOutOfStock } from "@/features/stock/utils/productStock";
import { formatStockAmount } from "@/features/stock/utils/stockUnits";
import { useTableAdmin } from "@/features/tables/hooks/useTableAdmin";
import { cn } from "@/lib/utils";

const PAYMENT_LABELS = {
  cash: "Dinheiro",
  card: "Cartão",
} as const;

const QUICK_LINKS = [
  { href: "/admin/mesas", label: "Mesas", icon: LayoutGrid },
  { href: "/admin/categorias", label: "Categorias", icon: FolderTree },
  { href: "/admin/produtos", label: "Produtos", icon: Package },
  { href: "/admin/estoque", label: "Estoque", icon: Warehouse },
  { href: "/admin/relatorios", label: "Relatórios", icon: ClipboardList },
] as const;

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  variant?: "default" | "primary" | "warning" | "danger";
}

function StatCard({ label, value, hint, variant = "default" }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-elevated">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 font-heading text-2xl font-bold",
          variant === "primary" && "text-primary",
          variant === "warning" && "text-amber-600 dark:text-amber-400",
          variant === "danger" && "text-destructive",
          variant === "default" && "text-foreground",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function WeeklySalesChart({
  salesByDay,
  formatCurrency,
}: {
  salesByDay: { dateKey: string; date: Date; total: number }[];
  formatCurrency: (value: number) => string;
}) {
  const lastSevenDays = salesByDay.slice(0, 7).reverse();
  const maxTotal = Math.max(...lastSevenDays.map((day) => day.total), 1);

  if (lastSevenDays.length === 0) {
    return (
      <div className="flex min-h-48 items-center justify-center px-4">
        <p className="text-center text-sm text-muted-foreground">
          Nenhuma venda nos últimos dias.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-44 items-end gap-2">
      {lastSevenDays.map((day) => {
        const heightPercent = (day.total / maxTotal) * 100;

        return (
          <div
            key={day.dateKey}
            className="group/bar flex min-w-0 flex-1 flex-col items-center gap-2"
          >
            <div className="relative flex h-32 w-full items-end justify-center">
              <div
                role="presentation"
                className="pointer-events-none absolute bottom-[calc(100%-0.25rem)] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1.5 text-xs font-semibold text-background opacity-0 shadow-elevated transition-opacity group-hover/bar:opacity-100"
              >
                {formatCurrency(day.total)}
              </div>
              <div
                className="w-full max-w-12 rounded-t-xl bg-primary/60 transition-all"
                style={{
                  height: `${Math.max(heightPercent, day.total > 0 ? 8 : 2)}%`,
                }}
              />
            </div>
            <span className="text-center text-[10px] font-semibold text-muted-foreground sm:text-xs">
              {formatReportDateShort(day.date)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function AdminDashboardPage() {
  const { formatCurrency } = useSettings();
  const { dailySales, dailyTotal, dailySalesCount, salesByDay, allTimeTotal, allSalesCount } =
    useSales();
  const { tables } = useTableAdmin();
  const { products } = useProducts();
  const { categories } = useMenuCatalog();
  const { trackedProducts, lowStockCount, outOfStockCount } = useStock();

  const occupiedTables = useMemo(
    () => tables.filter((table) => table.status === "occupied"),
    [tables],
  );

  const openOrdersTotal = useMemo(
    () => occupiedTables.reduce((sum, table) => sum + table.total, 0),
    [occupiedTables],
  );

  const stockAlerts = useMemo(
    () =>
      trackedProducts
        .filter((product) => isLowStock(product) || isOutOfStock(product))
        .sort((a, b) => a.stockQuantity - b.stockQuantity)
        .slice(0, 5),
    [trackedProducts],
  );

  const recentSales = dailySales.slice(0, 5);

  const todayLabel = new Date().toLocaleDateString("pt-PT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const stockAlertTotal = lowStockCount + outOfStockCount;

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b border-border bg-card px-6 py-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-heading text-xl font-bold text-foreground">Dashboard</h2>
            <p className="mt-1 text-sm capitalize text-muted-foreground">{todayLabel}</p>
          </div>
          <Link
            href="/admin/relatorios"
            className="inline-flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
          >
            <TrendingUp className="size-4" />
            Ver relatórios
          </Link>
        </div>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Vendas de hoje"
            value={formatCurrency(dailyTotal)}
            hint={`${dailySalesCount} ${dailySalesCount === 1 ? "venda" : "vendas"}`}
            variant="primary"
          />
          <StatCard
            label="Total geral"
            value={formatCurrency(allTimeTotal)}
            hint={`${allSalesCount} ${allSalesCount === 1 ? "venda" : "vendas"}`}
          />
          <StatCard
            label="Mesas ocupadas"
            value={`${occupiedTables.length} / ${tables.length}`}
            hint={
              openOrdersTotal > 0
                ? `${formatCurrency(openOrdersTotal)} em aberto`
                : "Nenhum pedido em aberto"
            }
          />
          <StatCard
            label="Alertas de estoque"
            value={String(stockAlertTotal)}
            hint={
              stockAlertTotal === 0
                ? "Estoque em dia"
                : `${outOfStockCount} esgotado(s) · ${lowStockCount} baixo(s)`
            }
            variant={
              outOfStockCount > 0 ? "danger" : stockAlertTotal > 0 ? "warning" : "default"
            }
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-elevated">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-heading text-base font-semibold text-foreground">
                  Vendas dos últimos dias
                </h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Resumo dos últimos 7 dias com movimento
                </p>
              </div>
            </div>
            <WeeklySalesChart salesByDay={salesByDay} formatCurrency={formatCurrency} />
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-elevated">
            <div className="mb-4">
              <h3 className="font-heading text-base font-semibold text-foreground">
                Vendas de hoje por horário
              </h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Distribuição das vendas ao longo do dia
              </p>
            </div>
            <DailySalesChart sales={dailySales} />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card shadow-elevated lg:col-span-2">
            <div className="border-b border-border px-5 py-4">
              <h3 className="font-heading text-base font-semibold text-foreground">
                Vendas recentes de hoje
              </h3>
            </div>

            {recentSales.length === 0 ? (
              <div className="flex min-h-40 items-center justify-center px-5 py-8">
                <p className="text-center text-sm text-muted-foreground">
                  Nenhuma venda registrada hoje.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {recentSales.map((sale) => (
                  <li
                    key={sale.id}
                    className="flex items-center justify-between gap-4 px-5 py-3.5"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        Mesa {sale.tableNumber} · {PAYMENT_LABELS[sale.paymentMethod]}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {sale.description}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-heading font-semibold text-primary">
                        {formatCurrency(sale.total)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatSaleSessionTime(sale)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-elevated">
              <h3 className="font-heading text-base font-semibold text-foreground">
                Resumo do cardápio
              </h3>
              <dl className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-sm text-muted-foreground">Categorias</dt>
                  <dd className="font-semibold text-foreground">{categories.length}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-sm text-muted-foreground">Produtos</dt>
                  <dd className="font-semibold text-foreground">{products.length}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-sm text-muted-foreground">Com controle de estoque</dt>
                  <dd className="font-semibold text-foreground">{trackedProducts.length}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-elevated">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-muted-foreground" />
                <h3 className="font-heading text-base font-semibold text-foreground">
                  Mesas em uso
                </h3>
              </div>

              {occupiedTables.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  Todas as mesas estão livres.
                </p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {occupiedTables.slice(0, 5).map((table) => (
                    <li
                      key={table.id}
                      className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2"
                    >
                      <span className="text-sm font-medium text-foreground">
                        Mesa {table.number}
                      </span>
                      <span className="text-sm font-semibold text-primary">
                        {formatCurrency(table.total)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        {stockAlerts.length > 0 && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-elevated dark:border-amber-900/50 dark:bg-amber-950/20">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <h3 className="font-heading text-base font-semibold text-foreground">
                    Produtos que precisam de atenção
                  </h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Itens com estoque baixo ou esgotado
                  </p>
                </div>
              </div>
              <Link
                href="/admin/estoque"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Gerenciar estoque
                <ArrowRight className="size-4" />
              </Link>
            </div>

            <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {stockAlerts.map((product) => (
                <li
                  key={product.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
                >
                  <span className="truncate text-sm font-medium text-foreground">
                    {product.name}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 text-sm font-semibold",
                      isOutOfStock(product) ? "text-destructive" : "text-amber-600 dark:text-amber-400",
                    )}
                  >
                    {formatStockAmount(product)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h3 className="mb-3 font-heading text-base font-semibold text-foreground">
            Acesso rápido
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 shadow-elevated transition-colors hover:bg-muted/50"
              >
                <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </div>
                <span className="text-sm font-medium text-foreground">{label}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
