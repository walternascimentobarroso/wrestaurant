"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronRight, FileText, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { getInvoiceImport, listInvoiceImports } from "@/features/invoices/services/invoiceService";
import type { InvoiceImportDetail, InvoiceImportSummary } from "@/features/invoices/types";

function formatDate(isoDate: string | null): string {
  if (!isoDate) {
    return "—";
  }

  return new Date(isoDate).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function statusLabel(status: string): string {
  if (status === "confirmed") {
    return "Confirmada";
  }

  return status;
}

export function AdminInvoiceImportsPage() {
  const { formatCurrency } = useSettings();
  const searchParams = useSearchParams();
  const showImportedBanner = searchParams.get("imported") === "1";

  const [imports, setImports] = useState<InvoiceImportSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<InvoiceImportDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const data = await listInvoiceImports();
        if (!cancelled) {
          setImports(data);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "Não foi possível carregar o histórico.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggleDetail = useCallback(async (importId: string) => {
    if (selectedId === importId) {
      setSelectedId(null);
      setSelectedDetail(null);
      return;
    }

    setSelectedId(importId);
    setIsLoadingDetail(true);

    try {
      const detail = await getInvoiceImport(importId);
      setSelectedDetail(detail);
    } catch {
      setSelectedDetail(null);
    } finally {
      setIsLoadingDetail(false);
    }
  }, [selectedId]);

  const totalImported = useMemo(
    () => imports.reduce((sum, entry) => sum + (entry.totalIncVat ?? 0), 0),
    [imports],
  );

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b border-border bg-card px-6 py-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-heading text-xl font-bold text-foreground">Notas fiscais</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Histórico de importações confirmadas
            </p>
          </div>
          <Button asChild className="rounded-xl">
            <Link href="/admin/notas-fiscais/importar">
              <Plus className="size-4" />
              Importar fatura
            </Link>
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {showImportedBanner ? (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
            Importação confirmada com sucesso. As compras já estão disponíveis em{" "}
            <Link href="/admin/compras" className="font-medium underline">
              Compras
            </Link>
            .
          </div>
        ) : null}

        <div className="mb-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-elevated">
            <p className="text-sm text-muted-foreground">Importações</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{imports.length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-elevated">
            <p className="text-sm text-muted-foreground">Total importado</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{formatCurrency(totalImported)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-elevated">
            <p className="text-sm text-muted-foreground">Itens importados</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {imports.reduce((sum, entry) => sum + entry.itemCount, 0)}
            </p>
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">A carregar histórico…</p>
        ) : null}

        {loadError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            {loadError}
          </div>
        ) : null}

        {!isLoading && !loadError && imports.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border px-6 py-10">
            <FileText className="size-10 text-muted-foreground/50" />
            <p className="text-muted-foreground">Nenhuma importação confirmada ainda.</p>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/admin/notas-fiscais/importar">Importar primeira fatura</Link>
            </Button>
          </div>
        ) : null}

        {!isLoading && imports.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Fornecedor</th>
                  <th className="px-4 py-3 font-medium">Fatura</th>
                  <th className="px-4 py-3 font-medium">Itens</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {imports.map((entry) => (
                  <tr key={entry.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">{formatDate(entry.confirmedAt ?? entry.issueDate)}</td>
                    <td className="px-4 py-3">{entry.supplierName ?? "—"}</td>
                    <td className="px-4 py-3">{entry.invoiceNumber ?? entry.documentId}</td>
                    <td className="px-4 py-3">{entry.itemCount}</td>
                    <td className="px-4 py-3">
                      {entry.totalIncVat != null ? formatCurrency(entry.totalIncVat) : "—"}
                    </td>
                    <td className="px-4 py-3">{statusLabel(entry.status)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="rounded-lg"
                        onClick={() => void handleToggleDetail(entry.id)}
                      >
                        Detalhe
                        <ChevronRight className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {selectedId ? (
          <div className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-elevated">
            <h3 className="font-medium text-foreground">Detalhe da importação</h3>
            {isLoadingDetail ? (
              <p className="mt-2 text-sm text-muted-foreground">A carregar detalhe…</p>
            ) : null}
            {selectedDetail ? (
              <div className="mt-3 space-y-3 text-sm">
                <p>
                  <span className="text-muted-foreground">Documento:</span>{" "}
                  {selectedDetail.documentId}
                </p>
                <p>
                  <span className="text-muted-foreground">Compras geradas:</span>{" "}
                  {selectedDetail.purchaseIds.length}
                </p>
                {selectedDetail.payableId ? (
                  <p>
                    <span className="text-muted-foreground">Conta a pagar:</span>{" "}
                    <Link
                      href="/admin/contas-a-pagar"
                      className="font-medium text-primary underline"
                    >
                      {selectedDetail.payableId}
                    </Link>
                  </p>
                ) : null}
                {selectedDetail.purchaseIds.length > 0 ? (
                  <ul className="space-y-1 rounded-xl border border-border p-3">
                    {selectedDetail.purchaseIds.map((purchaseId) => (
                      <li key={purchaseId}>
                        <Link
                          href="/admin/compras"
                          className="font-mono text-xs text-primary underline"
                        >
                          {purchaseId}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
