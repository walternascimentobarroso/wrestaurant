"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { SettingsButton } from "@/features/settings/components/SettingsButton";

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
      <div className="flex h-dvh items-center justify-center bg-zinc-100">
        <p className="text-lg text-zinc-500">Carregando mesa...</p>
      </div>
    );
  }

  if (!table) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-zinc-100">
        <p className="text-lg text-zinc-600">Mesa não encontrada.</p>
        <Link
          href="/"
          className="flex min-h-12 items-center rounded-2xl bg-amber-500 px-6 text-base font-semibold text-white active:scale-[0.98]"
        >
          Voltar para mesas
        </Link>
      </div>
    );
  }

  function handleClear() {
    clearTable(tableId);
    router.push("/");
  }

  return (
    <div className="flex h-dvh flex-col bg-zinc-100">
      <header className="shrink-0 border-b border-zinc-200 bg-white">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-xl text-zinc-700 transition active:scale-95 active:bg-zinc-200"
              aria-label="Voltar"
            >
              ←
            </Link>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                Mesa {table.number}
              </p>
              <h1 className="text-xl font-bold text-zinc-900">Cardápio</h1>
            </div>
          </div>
          <SettingsButton />
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-5">
        <section className="flex min-h-0 flex-col px-4 py-4 md:col-span-3">
          <ProductList
            items={table.items}
            onAdd={(productId) => addProduct(tableId, productId)}
          />
        </section>

        <aside className="min-h-0 border-t border-zinc-200 p-4 md:col-span-2 md:border-l md:border-t-0">
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
