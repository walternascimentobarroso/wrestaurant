"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { AppHeaderActions } from "@/components/app-header-actions";
import { brand } from "@/design-system";
import { ChecklistIncompleteBanner } from "@/features/checklists/components/ChecklistIncompleteBanner";

import { TABLE_CATEGORY_CONFIG } from "../data/initialTables";
import { TABLE_SECTION_LABELS } from "../types";
import { useTableStore } from "../hooks/useTableStore";
import { notifyTablesChanged } from "../services/tableStorage";
import { TableCard } from "./TableCard";

export function TablesPage() {
  const pathname = usePathname();
  const { tables, isLoaded } = useTableStore();

  useEffect(() => {
    if (pathname === "/") {
      notifyTablesChanged();
    }
  }, [pathname]);

  if (!isLoaded) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <p className="text-lg text-muted-foreground">Carregando mesas...</p>
      </div>
    );
  }

  return (
    <div className="flex h-dvh w-full min-w-0 flex-col bg-background">
      <header className="shrink-0 border-b border-border bg-card shadow-elevated">
        <div className="flex items-start justify-between gap-4 px-2 py-3 sm:px-3 lg:px-4">
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

      <main className="min-h-0 w-full min-w-0 flex-1 overflow-y-auto px-2 py-2 sm:px-3 sm:py-3 lg:px-4">
        <div className="mb-4">
          <ChecklistIncompleteBanner />
        </div>
        <div className="space-y-5 sm:space-y-6">
          {TABLE_CATEGORY_CONFIG.map(({ category }) => {
            const categoryTables = tables.filter((table) => table.category === category);

            if (categoryTables.length === 0) {
              return null;
            }

            return (
              <section key={category} className="w-full min-w-0">
                <h2 className="mb-2 font-heading text-lg font-semibold text-foreground sm:mb-3">
                  {TABLE_SECTION_LABELS[category]}
                </h2>
                <div className="flex w-full min-w-0 flex-wrap gap-2 sm:gap-2.5 lg:gap-3">
                  {categoryTables.map((table) => (
                    <TableCard key={table.id} table={table} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}
