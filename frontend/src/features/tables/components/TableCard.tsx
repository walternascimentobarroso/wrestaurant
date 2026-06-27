"use client";

import Link from "next/link";

import { useSettings } from "@/features/settings/hooks/useSettings";
import { cn } from "@/lib/utils";

import { TABLE_CATEGORY_LABELS, type TableWithDetails } from "../types";

interface TableCardProps {
  table: TableWithDetails;
}

export function TableCard({ table }: TableCardProps) {
  const { formatCurrency } = useSettings();
  const isOccupied = table.status === "occupied";
  const categoryLabel = TABLE_CATEGORY_LABELS[table.category];

  return (
    <Link
      href={`/mesas/${table.id}`}
      className="group block rounded-2xl border border-border bg-card p-6 shadow-elevated transition hover:-translate-y-0.5 hover:shadow-elevated-lg active:translate-y-px active:shadow-pressed"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            {categoryLabel}
          </p>
          <p className="mt-1 font-heading text-3xl font-bold text-foreground">
            {table.number}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold",
            isOccupied
              ? "bg-primary/20 text-primary"
              : "bg-accent/20 text-accent",
          )}
        >
          {isOccupied ? "Ocupada" : "Livre"}
        </span>
      </div>

      <div className="mt-6 space-y-1 text-sm text-muted-foreground">
        {isOccupied ? (
          <>
            <p>
              {table.itemCount} {table.itemCount === 1 ? "item" : "itens"}
            </p>
            <p className="font-semibold text-foreground">
              {formatCurrency(table.total)}
            </p>
          </>
        ) : (
          <p className="text-muted-foreground/70 group-hover:text-muted-foreground">
            Toque para abrir
          </p>
        )}
      </div>
    </Link>
  );
}
