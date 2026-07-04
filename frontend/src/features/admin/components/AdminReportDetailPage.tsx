"use client";

import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { DeleteSaleDialog } from "@/features/sales/components/DeleteSaleDialog";
import { DailyReportPanel } from "@/features/sales/components/DailyReportPanel";
import { DailyReportSummaryCards } from "@/features/sales/components/DailyReportSummaryCards";
import { SaleFormDialog } from "@/features/sales/components/SaleFormDialog";
import { useSaleAdmin } from "@/features/sales/hooks/useSaleAdmin";
import { useSales } from "@/features/sales/hooks/useSales";
import type { Sale, SaleFormInput } from "@/features/sales/types";
import {
  formatReportDate,
  parseLocalDateKey,
} from "@/features/sales/utils/formatReportDate";

interface AdminReportDetailPageProps {
  dateKey: string;
}

export function AdminReportDetailPage({ dateKey }: AdminReportDetailPageProps) {
  const { salesByDay } = useSales();
  const { createSale, updateSale, deleteSale } = useSaleAdmin();
  const report = salesByDay.find((group) => group.dateKey === dateKey);
  const parsedDate = parseLocalDateKey(dateKey);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedSale, setSelectedSale] = useState<Sale | undefined>();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);

  function openCreateDialog(): void {
    setFormMode("create");
    setSelectedSale(undefined);
    setFormOpen(true);
  }

  function openEditDialog(sale: Sale): void {
    setFormMode("edit");
    setSelectedSale(sale);
    setFormOpen(true);
  }

  function openDeleteDialog(sale: Sale): void {
    setSaleToDelete(sale);
    setDeleteOpen(true);
  }

  async function handleFormSubmit(input: SaleFormInput) {
    if (formMode === "create") {
      return createSale(input);
    }
    if (!selectedSale) {
      return { ok: false as const, error: "Venda não selecionada." };
    }
    return updateSale(selectedSale.id, input);
  }

  if (!parsedDate) {
    return (
      <div className="flex h-full flex-col">
        <header className="shrink-0 border-b border-border bg-card px-6 py-4">
          <Link
            href="/admin/relatorios"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Voltar aos relatórios
          </Link>
          <h2 className="mt-3 font-heading text-xl font-bold text-foreground">
            Data inválida
          </h2>
        </header>

        <div className="flex flex-1 items-center justify-center px-6">
          <p className="text-center text-muted-foreground">
            O formato da data do relatório não é válido.
          </p>
        </div>
      </div>
    );
  }

  const sales = report?.sales ?? [];

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b border-border bg-card px-6 py-4">
        <Link
          href="/admin/relatorios"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Voltar aos relatórios
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-xl font-bold capitalize text-foreground">
              {formatReportDate(parsedDate)}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {sales.length} {sales.length === 1 ? "venda" : "vendas"} registradas
            </p>
          </div>
          <Button type="button" onClick={openCreateDialog}>
            <Plus className="size-4" />
            Adicionar venda
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
        {sales.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border px-6 py-10">
            <p className="text-center text-muted-foreground">
              Nenhuma venda neste dia. Adicione vendas esquecidas ou corrija o relatório.
            </p>
            <Button type="button" onClick={openCreateDialog}>
              <Plus className="size-4" />
              Adicionar venda
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <DailyReportSummaryCards sales={sales} />

            <section aria-label="Detalhes das vendas">
              <DailyReportPanel
                sales={sales}
                showSummary={false}
                layout="page"
                editable
                onEdit={openEditDialog}
                onDelete={openDeleteDialog}
              />
            </section>
          </div>
        )}
      </div>

      <SaleFormDialog
        key={`${formMode}-${selectedSale?.id ?? dateKey}`}
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        dateKey={dateKey}
        sale={selectedSale}
        onSubmit={handleFormSubmit}
      />

      <DeleteSaleDialog
        key={saleToDelete?.id ?? "delete-sale"}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        sale={saleToDelete}
        onConfirm={(reason) => {
          if (!saleToDelete) {
            return Promise.resolve({ ok: false as const, error: "Venda não selecionada." });
          }
          return deleteSale(saleToDelete.id, reason);
        }}
      />
    </div>
  );
}
