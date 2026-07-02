"use client";

import { Banknote, CreditCard } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useSettings } from "@/features/settings/hooks/useSettings";
import type { StockActionResult } from "@/features/stock/types";
import { cn } from "@/lib/utils";

import type { PaymentMethod } from "../types";

interface ReceivePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableNumber: number;
  total: number;
  onConfirm: (payment: {
    method: PaymentMethod;
    amountReceived: number;
    change: number;
  }) => StockActionResult | Promise<StockActionResult>;
}

function formatAmountForInput(value: number): string {
  return value.toFixed(2);
}

function parseAmountInput(value: string): number {
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function ReceivePaymentDialog({
  open,
  onOpenChange,
  tableNumber,
  total,
  onConfirm,
}: ReceivePaymentDialogProps) {
  const { formatCurrency } = useSettings();
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [amountReceived, setAmountReceived] = useState(() =>
    formatAmountForInput(total),
  );
  const [confirmError, setConfirmError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const received = parseAmountInput(amountReceived);
  const change = method === "cash" ? Math.max(0, received - total) : 0;
  const isInsufficientCash = method === "cash" && received + 0.001 < total;

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setMethod(null);
      setAmountReceived(formatAmountForInput(total));
      setConfirmError("");
      setIsSubmitting(false);
    }
    onOpenChange(nextOpen);
  }

  function handleMethodSelect(nextMethod: PaymentMethod) {
    if (isSubmitting) {
      return;
    }
    setMethod(nextMethod);
    if (nextMethod === "card") {
      setAmountReceived(formatAmountForInput(total));
    }
  }

  async function handleConfirm() {
    if (!method || isInsufficientCash || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    const result = await onConfirm({
      method,
      amountReceived: received,
      change,
    });

    if (!result.ok) {
      setConfirmError(result.error ?? "Não foi possível confirmar o pagamento.");
      setIsSubmitting(false);
      return;
    }

    setMethod(null);
    setAmountReceived(formatAmountForInput(total));
    setConfirmError("");
    setIsSubmitting(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md rounded-3xl p-6 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            Receber pagamento
          </DialogTitle>
          <DialogDescription>
            Mesa {tableNumber} — informe o valor e a forma de pagamento
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl bg-muted px-5 py-4 text-center">
          <p className="text-sm text-muted-foreground">Total da conta</p>
          <p className="font-heading mt-1 text-3xl font-bold text-foreground">
            {formatCurrency(total)}
          </p>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="amount-received"
            className="text-sm font-semibold text-foreground"
          >
            Valor recebido
          </label>
          <Input
            id="amount-received"
            type="text"
            inputMode="decimal"
            value={amountReceived}
            readOnly={method === "card"}
            disabled={isSubmitting}
            onChange={(event) => setAmountReceived(event.target.value)}
            className="h-14 rounded-2xl px-4 text-xl font-semibold shadow-pressed"
          />
          {method === "card" && (
            <p className="text-sm text-muted-foreground">
              No cartão, o valor é igual ao total da conta.
            </p>
          )}
        </div>

        {method === "cash" && (
          <div
            className={cn(
              "rounded-2xl border-2 px-5 py-4 text-center",
              isInsufficientCash
                ? "border-destructive/40 bg-destructive/10"
                : "border-primary/30 bg-primary/10",
            )}
          >
            <p className="text-sm text-muted-foreground">Troco</p>
            <p
              className={cn(
                "font-heading mt-1 text-3xl font-bold",
                isInsufficientCash ? "text-destructive" : "text-primary",
              )}
            >
              {isInsufficientCash
                ? `Faltam ${formatCurrency(total - received)}`
                : formatCurrency(change)}
            </p>
          </div>
        )}

        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">
            Forma de pagamento
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleMethodSelect("cash")}
              className={cn(
                "flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border-2 p-4 transition hover:-translate-y-0.5 active:translate-y-px",
                method === "cash"
                  ? "border-primary bg-primary/10 shadow-elevated"
                  : "border-border bg-card shadow-pressed hover:shadow-elevated",
              )}
            >
              <Banknote className="size-7 text-primary" />
              <span className="text-base font-semibold text-foreground">
                Dinheiro
              </span>
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleMethodSelect("card")}
              className={cn(
                "flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border-2 p-4 transition hover:-translate-y-0.5 active:translate-y-px",
                method === "card"
                  ? "border-primary bg-primary/10 shadow-elevated"
                  : "border-border bg-card shadow-pressed hover:shadow-elevated",
              )}
            >
              <CreditCard className="size-7 text-primary" />
              <span className="text-base font-semibold text-foreground">
                Cartão
              </span>
            </button>
          </div>
        </div>

        {confirmError ? (
          <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {confirmError}
          </p>
        ) : null}

        <Button
          type="button"
          disabled={!method || isInsufficientCash || isSubmitting}
          onClick={handleConfirm}
          className="h-14 w-full rounded-2xl text-base font-semibold shadow-elevated hover:shadow-elevated-lg"
        >
          {isSubmitting ? "Sincronizando pagamento..." : "Confirmar recebimento"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
