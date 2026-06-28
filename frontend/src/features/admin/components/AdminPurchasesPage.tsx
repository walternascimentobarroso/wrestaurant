"use client";

import { useMemo, useState } from "react";
import { History, Package, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePurchases } from "@/features/purchases/hooks/usePurchases";
import { useSettings } from "@/features/settings/hooks/useSettings";
import type { PurchaseRecord } from "@/features/purchases/types";
import { getBestPriceRecord } from "@/features/purchases/utils/purchaseInsights";

const PAGE_SIZE = 15;

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function AdminPurchasesPage() {
  const { formatCurrency } = useSettings();
  const { records, totalPurchases } = usePurchases();

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredRecords = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return records
      .filter((record) => {
        if (!normalizedQuery) {
          return true;
        }

        const haystack = [
          record.productName,
          record.supplierName,
          record.notes ?? "",
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(normalizedQuery);
      })
      .sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt));
  }, [records, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const effectivePage = Math.min(currentPage, totalPages);

  const paginatedRecords = useMemo(() => {
    const start = (effectivePage - 1) * PAGE_SIZE;
    return filteredRecords.slice(start, start + PAGE_SIZE);
  }, [filteredRecords, effectivePage]);

  const rangeStart =
    filteredRecords.length === 0 ? 0 : (effectivePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(effectivePage * PAGE_SIZE, filteredRecords.length);

  const totalSpent = useMemo(
    () => records.reduce((sum, record) => sum + record.totalCost, 0),
    [records],
  );

  const uniqueProducts = useMemo(
    () => new Set(records.map((record) => record.productId)).size,
    [records],
  );

  const uniqueSuppliers = useMemo(
    () => new Set(records.map((record) => record.supplierId)).size,
    [records],
  );

  const bestByProduct = useMemo(() => {
    const grouped = new Map<string, PurchaseRecord[]>();

    for (const record of records) {
      const existing = grouped.get(record.productId) ?? [];
      grouped.set(record.productId, [...existing, record]);
    }

    return grouped;
  }, [records]);

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b border-border bg-card px-6 py-4">
        <h2 className="font-heading text-xl font-bold text-foreground">Histórico de compras</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Acompanhe preços, fornecedores e compare o melhor custo por produto
        </p>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-elevated">
            <p className="text-sm text-muted-foreground">Compras registradas</p>
            <p className="mt-1 font-heading text-2xl font-bold text-foreground">{totalPurchases}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-elevated">
            <p className="text-sm text-muted-foreground">Total gasto</p>
            <p className="mt-1 font-heading text-2xl font-bold text-primary">
              {formatCurrency(totalSpent)}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-elevated">
            <p className="text-sm text-muted-foreground">Produtos</p>
            <p className="mt-1 font-heading text-2xl font-bold text-foreground">{uniqueProducts}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-elevated">
            <p className="text-sm text-muted-foreground">Fornecedores</p>
            <p className="mt-1 font-heading text-2xl font-bold text-foreground">
              {uniqueSuppliers}
            </p>
          </div>
        </div>

        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="Buscar por produto, fornecedor ou nota"
            className="h-10 rounded-xl pr-3 pl-9"
          />
        </div>

        {filteredRecords.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border px-6 py-10">
            <History className="size-10 text-muted-foreground/50" />
            <p className="text-center text-muted-foreground">
              {records.length === 0
                ? "Nenhuma compra registrada. Registre entradas em Estoque para começar o histórico."
                : "Nenhuma compra encontrada para a busca."}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left">
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Produto</th>
                  <th className="px-4 py-3 font-medium">Fornecedor</th>
                  <th className="px-4 py-3 font-medium text-right">Qtd</th>
                  <th className="px-4 py-3 font-medium text-right">Unit.</th>
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                  <th className="px-4 py-3 font-medium">Melhor?</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.map((record) => {
                  const productRecords = bestByProduct.get(record.productId) ?? [];
                  const bestRecord = getBestPriceRecord(productRecords);
                  const isBest =
                    bestRecord?.id === record.id && productRecords.length > 1;

                  return (
                    <tr key={record.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(record.purchasedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Package className="size-3.5 text-primary" />
                          <span className="font-medium text-foreground">{record.productName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{record.supplierName}</td>
                      <td className="px-4 py-3 text-right">{record.quantity}</td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatCurrency(record.unitCost)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatCurrency(record.totalCost)}
                      </td>
                      <td className="px-4 py-3">
                        {isBest ? (
                          <span className="inline-flex rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                            Melhor preço
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredRecords.length > PAGE_SIZE ? (
              <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Mostrando {rangeStart}–{rangeEnd} de {filteredRecords.length} compras
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    disabled={effectivePage <= 1}
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  >
                    Anterior
                  </Button>
                  <span className="min-w-24 text-center text-sm font-medium text-foreground">
                    Página {effectivePage} de {totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    disabled={effectivePage >= totalPages}
                    onClick={() =>
                      setCurrentPage((page) => Math.min(totalPages, page + 1))
                    }
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
