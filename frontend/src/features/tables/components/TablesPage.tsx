"use client";

import { AppHeaderActions } from "@/components/app-header-actions";
import { brand } from "@/design-system";

import { TableCard } from "./TableCard";
import { useTableStore } from "../hooks/useTableStore";

export function TablesPage() {
  const { tables, isLoaded } = useTableStore();

  if (!isLoaded) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <p className="text-lg text-muted-foreground">Carregando mesas...</p>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="shrink-0 border-b border-border bg-card shadow-elevated">
        <div className="flex items-start justify-between gap-4 px-4 py-3">
          <div>
            <p className="font-heading text-xs font-semibold uppercase tracking-wide text-primary">
              {brand}
            </p>
            <h1 className="font-heading text-xl font-bold text-foreground">Mesas</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Selecione uma mesa para adicionar produtos ao pedido.
            </p>
          </div>
          <AppHeaderActions />
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
