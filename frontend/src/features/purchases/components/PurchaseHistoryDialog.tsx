"use client";

import { TrendingDown, TrendingUp } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import type { ProductPurchaseInsights, PurchaseRecord } from "../types";
import { getBestPriceRecord } from "../utils/purchaseInsights";

interface PurchaseHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  records: PurchaseRecord[];
  insights?: ProductPurchaseInsights | null;
  formatCurrency: (value: number) => string;
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function PurchaseHistoryDialog({
  open,
  onOpenChange,
  title,
  description,
  records,
  insights,
  formatCurrency,
}: PurchaseHistoryDialogProps) {
  const bestRecord = insights?.bestRecord ?? getBestPriceRecord(records);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[100] max-h-[85vh] overflow-y-auto rounded-3xl p-6 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        {insights?.bestRecord && insights.worstRecord && insights.savingsVsWorst !== null ? (
          <div className="rounded-2xl border border-border bg-muted/30 p-4 text-sm">
            <p className="font-medium text-foreground">Resumo de preços</p>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              <li>
                Melhor preço:{" "}
                <span className="font-semibold text-emerald-600">
                  {formatCurrency(insights.bestRecord.unitCost)}
                </span>{" "}
                ({insights.bestRecord.supplierName}, {formatDate(insights.bestRecord.purchasedAt)})
              </li>
              {insights.worstRecord.id !== insights.bestRecord.id ? (
                <li>
                  Pior preço:{" "}
                  <span className="font-semibold text-destructive">
                    {formatCurrency(insights.worstRecord.unitCost)}
                  </span>{" "}
                  ({insights.worstRecord.supplierName},{" "}
                  {formatDate(insights.worstRecord.purchasedAt)})
                </li>
              ) : null}
              {insights.savingsPercentVsWorst !== null ? (
                <li>
                  Economia vs. pior preço:{" "}
                  <span className="font-semibold text-emerald-600">
                    {formatCurrency(insights.savingsVsWorst ?? 0)}/un (
                    {insights.savingsPercentVsWorst.toFixed(1)}%)
                  </span>
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}

        {records.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma compra registrada ainda.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left">
                  <th className="px-3 py-2.5 font-medium">Data</th>
                  <th className="px-3 py-2.5 font-medium">Fornecedor</th>
                  <th className="px-3 py-2.5 font-medium">Produto</th>
                  <th className="px-3 py-2.5 font-medium text-right">Qtd</th>
                  <th className="px-3 py-2.5 font-medium text-right">Unit.</th>
                  <th className="px-3 py-2.5 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => {
                  const isBest = bestRecord?.id === record.id && records.length > 1;

                  return (
                    <tr key={record.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {formatDate(record.purchasedAt)}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-foreground">
                        {record.supplierName}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">{record.productName}</td>
                      <td className="px-3 py-2.5 text-right">{record.quantity}</td>
                      <td className="px-3 py-2.5 text-right">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 font-semibold",
                            isBest ? "text-emerald-600" : "text-foreground",
                          )}
                        >
                          {isBest ? <TrendingDown className="size-3.5" /> : null}
                          {formatCurrency(record.unitCost)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium">
                        {formatCurrency(record.totalCost)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {records.some((record) => record.notes) ? (
          <div className="space-y-2 text-sm">
            <p className="font-medium text-foreground">Observações</p>
            {records
              .filter((record) => record.notes)
              .map((record) => (
                <p key={record.id} className="text-muted-foreground">
                  {formatDate(record.purchasedAt)} — {record.notes}
                </p>
              ))}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

interface PriceComparisonAlertProps {
  comparison: {
    previousUnitCost: number;
    previousSupplierName: string;
    difference: number;
    percentChange: number;
    isCheaper: boolean;
  } | null;
  formatCurrency: (value: number) => string;
}

export function PriceComparisonAlert({ comparison, formatCurrency }: PriceComparisonAlertProps) {
  if (!comparison) {
    return null;
  }

  if (comparison.difference === 0) {
    return (
      <p className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        Mesmo preço da última compra ({comparison.previousSupplierName} —{" "}
        {formatCurrency(comparison.previousUnitCost)}).
      </p>
    );
  }

  return (
    <p
      className={cn(
        "flex items-start gap-2 rounded-xl border px-3 py-2 text-sm",
        comparison.isCheaper
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-amber-200 bg-amber-50 text-amber-800",
      )}
    >
      {comparison.isCheaper ? (
        <TrendingDown className="mt-0.5 size-4 shrink-0" />
      ) : (
        <TrendingUp className="mt-0.5 size-4 shrink-0" />
      )}
      <span>
        {comparison.isCheaper ? "Mais barato" : "Mais caro"} que a última compra (
        {comparison.previousSupplierName} — {formatCurrency(comparison.previousUnitCost)}):{" "}
        <strong>
          {comparison.isCheaper ? "-" : "+"}
          {formatCurrency(Math.abs(comparison.difference))}/un (
          {Math.abs(comparison.percentChange).toFixed(1)}%)
        </strong>
      </span>
    </p>
  );
}
