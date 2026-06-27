"use client";

import { SettingsButton } from "@/features/settings/components/SettingsButton";

import { TableCard } from "./TableCard";
import { useTableStore } from "../hooks/useTableStore";

export function TablesPage() {
  const { tables, isLoaded } = useTableStore();

  if (!isLoaded) {
    return (
      <div className="flex h-dvh items-center justify-center bg-zinc-100">
        <p className="text-lg text-zinc-500">Carregando mesas...</p>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-zinc-100">
      <header className="shrink-0 border-b border-zinc-200 bg-white">
        <div className="flex items-start justify-between gap-4 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
              Restaurant
            </p>
            <h1 className="text-xl font-bold text-zinc-900">Mesas</h1>
            <p className="mt-1 text-sm text-zinc-600">
              Selecione uma mesa para adicionar produtos ao pedido.
            </p>
          </div>
          <SettingsButton />
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {tables.map((table) => (
            <TableCard key={table.id} table={table} />
          ))}
        </div>
      </main>
    </div>
  );
}
