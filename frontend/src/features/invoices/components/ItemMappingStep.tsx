"use client";

import { Button } from "@/components/ui/button";

import type { InvoiceImportProgress, ItemMappingState } from "../types";
import { ItemMappingRow } from "./ItemMappingRow";

interface ItemMappingStepProps {
  itemMappings: ItemMappingState[];
  progress: InvoiceImportProgress;
  onSelectProduct: (lineNumber: number, productId: string) => void;
  onSkip: (lineNumber: number) => void;
  onConfirm: (lineNumber: number) => void;
  onQuantityChange: (lineNumber: number, quantity: number) => void;
  onUnitCostChange: (lineNumber: number, unitCost: number) => void;
  onConfirmAllHighConfidence: () => void;
  onContinue: () => void;
}

export function ItemMappingStep({
  itemMappings,
  progress,
  onSelectProduct,
  onSkip,
  onConfirm,
  onQuantityChange,
  onUnitCostChange,
  onConfirmAllHighConfidence,
  onContinue,
}: ItemMappingStepProps) {
  const canContinue = progress.confirmed > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-elevated">
        <p className="text-sm font-medium text-foreground">
          {progress.confirmed} de {progress.total} itens confirmados
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={onConfirmAllHighConfidence}
          >
            Confirmar todos com ≥ 90%
          </Button>
          <Button
            type="button"
            size="sm"
            className="rounded-xl"
            disabled={!canContinue}
            onClick={onContinue}
          >
            Ir para revisão
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
        <div className="max-h-[min(70vh,720px)] overflow-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
              <tr className="border-b border-border text-left">
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">#</th>
                <th className="px-3 py-3 font-medium">Descrição (NF)</th>
                <th className="px-3 py-3 font-medium">Qtd</th>
                <th className="px-3 py-3 font-medium">Un</th>
                <th className="px-3 py-3 font-medium">Preço un.</th>
                <th className="px-3 py-3 font-medium">Produto</th>
                <th className="px-3 py-3 font-medium">Ação</th>
              </tr>
            </thead>
            <tbody>
              {itemMappings.map((mapping) => (
                <ItemMappingRow
                  key={mapping.lineNumber}
                  mapping={mapping}
                  onSelectProduct={(productId) => onSelectProduct(mapping.lineNumber, productId)}
                  onSkip={() => onSkip(mapping.lineNumber)}
                  onConfirm={() => onConfirm(mapping.lineNumber)}
                  onQuantityChange={(quantity) => onQuantityChange(mapping.lineNumber, quantity)}
                  onUnitCostChange={(unitCost) => onUnitCostChange(mapping.lineNumber, unitCost)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
