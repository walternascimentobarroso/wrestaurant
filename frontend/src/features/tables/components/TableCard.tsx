"use client";

import Link from "next/link";

import { useSettings } from "@/features/settings/hooks/useSettings";

import type { TableWithDetails } from "../types";

interface TableCardProps {
  table: TableWithDetails;
}

export function TableCard({ table }: TableCardProps) {
  const { formatCurrency } = useSettings();
  const isOccupied = table.status === "occupied";

  return (
    <Link
      href={`/mesas/${table.id}`}
      className="group block rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-amber-400 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Mesa
          </p>
          <p className="mt-1 text-3xl font-bold text-zinc-900">
            {table.number}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            isOccupied
              ? "bg-amber-100 text-amber-800"
              : "bg-emerald-100 text-emerald-800"
          }`}
        >
          {isOccupied ? "Ocupada" : "Livre"}
        </span>
      </div>

      <div className="mt-6 space-y-1 text-sm text-zinc-600">
        {isOccupied ? (
          <>
            <p>{table.itemCount} {table.itemCount === 1 ? "item" : "itens"}</p>
            <p className="font-semibold text-zinc-900">
              {formatCurrency(table.total)}
            </p>
          </>
        ) : (
          <p className="text-zinc-400 group-hover:text-zinc-600">
            Toque para abrir
          </p>
        )}
      </div>
    </Link>
  );
}
