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
      className={cn(
        "group flex aspect-square w-full min-w-0 flex-col rounded-2xl border p-3 shadow-elevated transition hover:-translate-y-0.5 hover:shadow-elevated-lg active:translate-y-px active:shadow-pressed sm:p-4 lg:p-5",
        isOccupied
          ? "border-2 border-[var(--table-occupied-border)] bg-table-occupied shadow-elevated-lg ring-2 ring-[var(--table-occupied-ring)]"
          : "border-border bg-card",
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p
            className={cn(
              "text-sm font-medium uppercase tracking-wide",
              isOccupied
                ? "text-muted-foreground dark:text-table-occupied-muted"
                : "text-muted-foreground",
            )}
          >
            {categoryLabel}
          </p>
          <p
            className={cn(
              "mt-1 font-heading text-3xl font-bold sm:text-4xl lg:text-5xl",
              isOccupied ? "text-primary dark:text-table-occupied-foreground" : "text-foreground",
            )}
          >
            {table.number}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold",
            isOccupied
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-accent/20 text-accent",
          )}
        >
          {isOccupied ? "Ocupada" : "Livre"}
        </span>
      </div>

      <div
        className={cn(
          "mt-auto space-y-1 pt-4 text-sm",
          isOccupied
            ? "text-muted-foreground dark:text-table-occupied-muted"
            : "text-muted-foreground",
        )}
      >
        {isOccupied ? (
          <>
            <p>
              {table.itemCount} {table.itemCount === 1 ? "item" : "itens"}
            </p>
            <p className="font-semibold text-foreground dark:text-table-occupied-foreground">
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
