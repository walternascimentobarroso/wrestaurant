"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { AppHeaderActions } from "@/components/app-header-actions";
import { Button } from "@/components/ui/button";

import { OrderSummary } from "./OrderSummary";
import { ProductList } from "./ProductList";
import { useTableStore } from "../hooks/useTableStore";

interface TableDetailPageProps {
  tableId: number;
}

export function TableDetailPage({ tableId }: TableDetailPageProps) {
  const router = useRouter();
  const { isLoaded, getTable, addProduct, removeProduct, clearTable } =
    useTableStore();

  const table = getTable(tableId);

  if (!isLoaded) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <p className="text-lg text-muted-foreground">Carregando mesa...</p>
      </div>
    );
  }

  if (!table) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-background">
        <p className="text-lg text-muted-foreground">Mesa não encontrada.</p>
        <Button
          render={<Link href="/" />}
          size="lg"
          className="min-h-12 rounded-2xl px-6"
        >
          Voltar para mesas
        </Button>
      </div>
    );
  }

  function handleClear() {
    clearTable(tableId);
    router.push("/");
  }

  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="shrink-0 border-b border-border bg-card shadow-sm">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon-lg"
              className="size-12 rounded-2xl"
              render={<Link href="/" aria-label="Voltar" />}
            >
              ←
            </Button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                Mesa {table.number}
              </p>
              <h1 className="text-xl font-bold text-foreground">Cardápio</h1>
            </div>
          </div>
          <AppHeaderActions />
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-5">
        <section className="flex min-h-0 flex-col px-4 py-4 md:col-span-3">
          <ProductList
            items={table.items}
            onAdd={(productId) => addProduct(tableId, productId)}
          />
        </section>

        <aside className="min-h-0 border-t border-border p-4 md:col-span-2 md:border-l md:border-t-0">
          <OrderSummary
            items={table.items}
            tableNumber={table.number}
            onRemove={(productId) => removeProduct(tableId, productId)}
            onClear={handleClear}
          />
        </aside>
      </main>
    </div>
  );
}
