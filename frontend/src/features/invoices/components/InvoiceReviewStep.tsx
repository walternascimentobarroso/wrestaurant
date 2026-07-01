"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProducts } from "@/features/menu/hooks/useProducts";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { useSuppliers } from "@/features/suppliers/hooks/useSuppliers";
import { cn } from "@/lib/utils";

import type { InvoiceDraft, ItemMappingState } from "../types";
import { lineTotalWithVat, unitCostWithVat } from "../utils/vatRate";

interface InvoiceReviewStepProps {
  draft: InvoiceDraft;
  confirmedSupplierId: string;
  itemMappings: ItemMappingState[];
  purchasedAt: string;
  notes: string;
  createPayable: boolean;
  isConfirming: boolean;
  confirmError: string | null;
  onPurchasedAtChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onCreatePayableChange: (value: boolean) => void;
  onBack: () => void;
  onConfirm: () => void;
}

export function InvoiceReviewStep({
  draft,
  confirmedSupplierId,
  itemMappings,
  purchasedAt,
  notes,
  createPayable,
  isConfirming,
  confirmError,
  onPurchasedAtChange,
  onNotesChange,
  onCreatePayableChange,
  onBack,
  onConfirm,
}: InvoiceReviewStepProps) {
  const { formatCurrency } = useSettings();
  const { suppliers } = useSuppliers();
  const { products } = useProducts();

  const supplier = suppliers.find((entry) => entry.id === confirmedSupplierId);

  const confirmedItems = itemMappings.filter(
    (mapping) => mapping.confirmed && mapping.action === "map",
  );
  const skippedItems = itemMappings.filter((mapping) => mapping.action === "skip");

  const itemsTotalExVat = confirmedItems.reduce(
    (sum, mapping) => sum + mapping.quantity * mapping.unitCost,
    0,
  );
  const itemsTotalIncVat = confirmedItems.reduce(
    (sum, mapping) => sum + lineTotalWithVat(mapping.quantity, mapping.unitCost, mapping.vatRate),
    0,
  );
  const invoiceTotal = draft.totals.totalIncVat;
  const totalDifference = Math.abs(itemsTotalIncVat - invoiceTotal);
  const hasTotalMismatch = totalDifference > 1;
  const canConfirm = confirmedItems.length > 0 && !isConfirming;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-elevated">
          <p className="text-sm text-muted-foreground">Fornecedor</p>
          <p className="mt-1 font-semibold text-foreground">{supplier?.name ?? "—"}</p>
          {supplier?.taxId ? (
            <p className="text-sm text-muted-foreground">NIF: {supplier.taxId}</p>
          ) : (
            <p className="text-sm text-muted-foreground">NIF: {draft.supplier.taxId}</p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-elevated">
          <p className="text-sm text-muted-foreground">Resumo dos itens</p>
          <p className="mt-1 font-semibold text-foreground">
            {confirmedItems.length} confirmados, {skippedItems.length} ignorados
          </p>
          <p className="text-sm text-muted-foreground">
            de {itemMappings.length} linhas na fatura
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-elevated">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Soma dos itens confirmados (c/ IVA)</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {formatCurrency(itemsTotalIncVat)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              s/ IVA: {formatCurrency(itemsTotalExVat)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total da fatura (c/ IVA)</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{formatCurrency(invoiceTotal)}</p>
          </div>
        </div>

        {hasTotalMismatch ? (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>
              Divergência de {formatCurrency(totalDifference)} entre a soma dos itens e o total da
              fatura. Revise quantidades e preços antes de confirmar.
            </p>
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-elevated">
        <h3 className="font-medium text-foreground">Itens a importar</h3>
        <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto text-sm">
          {confirmedItems.map((mapping) => {
            const product = products.find((entry) => entry.id === mapping.selectedProductId);
            return (
              <li
                key={mapping.lineNumber}
                className="flex items-start justify-between gap-3 border-b border-border pb-2 last:border-0"
              >
                <div>
                  <p className="font-medium text-foreground">{product?.name ?? "Produto"}</p>
                  <p className="text-muted-foreground">{mapping.draftItem.description}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-foreground">
                    {mapping.quantity} × {formatCurrency(unitCostWithVat(mapping.unitCost, mapping.vatRate))}
                  </p>
                  <p className="text-muted-foreground">
                    {formatCurrency(lineTotalWithVat(mapping.quantity, mapping.unitCost, mapping.vatRate))}{" "}
                    · IVA {mapping.vatRate}%
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="purchase-date" className="text-sm font-medium">
            Data da compra
          </label>
          <Input
            id="purchase-date"
            type="date"
            value={purchasedAt}
            onChange={(event) => onPurchasedAtChange(event.target.value)}
            className="h-11 rounded-xl px-3"
          />
        </div>

        <div className="space-y-2">
          <span className="text-sm font-medium">Conta a pagar</span>
          <label className="flex items-center gap-2 rounded-xl border border-border px-3 py-3 text-sm">
            <input
              type="checkbox"
              checked={createPayable}
              disabled={isConfirming}
              onChange={(event) => onCreatePayableChange(event.target.checked)}
              className="size-4 rounded border-border"
            />
            <span className="text-foreground">Criar conta a pagar (categoria Fornecedores)</span>
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="purchase-notes" className="text-sm font-medium">
          Notas
        </label>
        <textarea
          id="purchase-notes"
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          rows={3}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
        />
      </div>

      {confirmError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
          {confirmError}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          className="rounded-xl"
          onClick={onBack}
          disabled={isConfirming}
        >
          Voltar aos itens
        </Button>
        <Button
          type="button"
          className="rounded-xl"
          disabled={!canConfirm}
          onClick={onConfirm}
        >
          {isConfirming ? "A confirmar…" : "Confirmar importação"}
        </Button>
        {!canConfirm && confirmedItems.length === 0 ? (
          <span className={cn("text-sm text-muted-foreground")}>
            Confirme pelo menos um item para importar
          </span>
        ) : null}
      </div>
    </div>
  );
}
