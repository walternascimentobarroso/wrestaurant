"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useSettings } from "@/features/settings/hooks/useSettings";

import type { Sale, SaleActionResult } from "../types";
import { formatSaleSessionTime } from "../utils/formatReportDate";

interface DeleteSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale | null;
  onConfirm: (reason: string) => Promise<SaleActionResult>;
}

export function DeleteSaleDialog({
  open,
  onOpenChange,
  sale,
  onConfirm,
}: DeleteSaleDialogProps) {
  const { formatCurrency } = useSettings();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm(): Promise<void> {
    setError(null);
    setSubmitting(true);
    const result = await onConfirm(reason);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Excluir venda</DialogTitle>
          <DialogDescription>
            Esta ação remove a venda do relatório e restaura o estoque no servidor após a
            sincronização.
          </DialogDescription>
        </DialogHeader>

        {sale ? (
          <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">
            <p className="font-medium text-foreground">{formatSaleSessionTime(sale)}</p>
            <p className="mt-1 text-muted-foreground">
              Mesa {sale.tableNumber} · {formatCurrency(sale.total)}
            </p>
          </div>
        ) : null}

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-foreground">Motivo da exclusão</span>
          <Input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Ex.: venda registrada em duplicado"
          />
        </label>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void handleConfirm()}
            disabled={submitting}
          >
            {submitting ? "Excluindo…" : "Excluir venda"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
