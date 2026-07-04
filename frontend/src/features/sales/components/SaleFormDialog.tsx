"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

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
import { useMenuProducts } from "@/features/menu/hooks/useProducts";
import { useSettings } from "@/features/settings/hooks/useSettings";
import type { PaymentMethod } from "@/features/tables/types";
import { cn } from "@/lib/utils";

import type { Sale, SaleActionResult, SaleFormInput } from "../types";
import {
  getLocalDateKey,
  parseLocalDateKey,
} from "../utils/formatReportDate";

interface SaleItemRow {
  productId: string;
  quantity: string;
}

interface SaleFormState {
  tableNumber: string;
  paidDate: string;
  paidTime: string;
  paymentMethod: PaymentMethod;
  amountReceived: string;
  change: string;
  items: SaleItemRow[];
  reason: string;
}

interface SaleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  dateKey: string;
  sale?: Sale;
  onSubmit: (input: SaleFormInput) => Promise<SaleActionResult>;
}

function isoToTime(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function buildLocalIsoDate(dateKey: string, time: string): string {
  const parsed = parseLocalDateKey(dateKey);
  if (!parsed) {
    return new Date().toISOString();
  }

  const [hours, minutes] = time.split(":").map((part) => Number.parseInt(part, 10));
  parsed.setHours(hours || 0, minutes || 0, 0, 0);
  return parsed.toISOString();
}

function defaultPaidTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function emptyForm(dateKey: string): SaleFormState {
  return {
    tableNumber: "1",
    paidDate: dateKey,
    paidTime: defaultPaidTime(),
    paymentMethod: "cash",
    amountReceived: "",
    change: "0",
    items: [{ productId: "", quantity: "1" }],
    reason: "",
  };
}

function saleToForm(sale: Sale): SaleFormState {
  return {
    tableNumber: String(sale.tableNumber),
    paidDate: getLocalDateKey(sale.paidAt),
    paidTime: isoToTime(sale.paidAt),
    paymentMethod: sale.paymentMethod,
    amountReceived: String(sale.amountReceived),
    change: String(sale.change),
    items: sale.items.map((item) => ({
      productId: item.productId,
      quantity: String(item.quantity),
    })),
    reason: sale.adjustmentReason ?? "",
  };
}

function computeTotal(
  items: SaleItemRow[],
  products: { id: string; price: number }[],
): number {
  return items.reduce((sum, row) => {
    const product = products.find((entry) => entry.id === row.productId);
    const quantity = Number.parseInt(row.quantity, 10);
    if (!product || !Number.isFinite(quantity) || quantity <= 0) {
      return sum;
    }
    return sum + product.price * quantity;
  }, 0);
}

export function SaleFormDialog({
  open,
  onOpenChange,
  mode,
  dateKey,
  sale,
  onSubmit,
}: SaleFormDialogProps) {
  const { formatCurrency } = useSettings();
  const menuProducts = useMenuProducts();
  const [form, setForm] = useState<SaleFormState>(() =>
    mode === "edit" && sale ? saleToForm(sale) : emptyForm(dateKey),
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const total = useMemo(
    () => computeTotal(form.items, menuProducts),
    [form.items, menuProducts],
  );

  function setPaymentMethod(method: PaymentMethod): void {
    setForm((current) => ({
      ...current,
      paymentMethod: method,
      ...(method === "card"
        ? {
            amountReceived: total > 0 ? String(total) : current.amountReceived,
            change: "0",
          }
        : {}),
    }));
  }

  function updateItem(index: number, patch: Partial<SaleItemRow>): void {
    setForm((current) => ({
      ...current,
      items: current.items.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row,
      ),
    }));
  }

  function addItemRow(): void {
    setForm((current) => ({
      ...current,
      items: [...current.items, { productId: "", quantity: "1" }],
    }));
  }

  function removeItemRow(index: number): void {
    setForm((current) => ({
      ...current,
      items:
        current.items.length === 1
          ? current.items
          : current.items.filter((_, rowIndex) => rowIndex !== index),
    }));
  }

  async function handleSubmit(): Promise<void> {
    setError(null);
    setSubmitting(true);

    const amountReceived = Number.parseFloat(form.amountReceived);
    const change = Number.parseFloat(form.change);
    const items = form.items
      .map((row) => ({
        productId: row.productId,
        quantity: Number.parseInt(row.quantity, 10),
      }))
      .filter((row) => row.productId);

    const input: SaleFormInput = {
      tableNumber: Number.parseInt(form.tableNumber, 10),
      paidAt: buildLocalIsoDate(form.paidDate, form.paidTime),
      paymentMethod: form.paymentMethod,
      amountReceived: form.paymentMethod === "card" ? total : amountReceived,
      change: form.paymentMethod === "card" ? 0 : change,
      items,
      reason: form.reason,
    };

    const result = await onSubmit(input);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Adicionar venda" : "Editar venda"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Registre uma venda que faltou no relatório deste dia."
              : "Corrija os dados da venda. O motivo fica registrado para auditoria."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-foreground">Mesa</span>
              <Input
                type="number"
                min={1}
                value={form.tableNumber}
                onChange={(event) =>
                  setForm((current) => ({ ...current, tableNumber: event.target.value }))
                }
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-foreground">Data</span>
              <Input
                type="date"
                value={form.paidDate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, paidDate: event.target.value }))
                }
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-foreground">Hora</span>
              <Input
                type="time"
                value={form.paidTime}
                onChange={(event) =>
                  setForm((current) => ({ ...current, paidTime: event.target.value }))
                }
              />
            </label>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Itens</span>
              <Button type="button" variant="outline" size="sm" onClick={addItemRow}>
                <Plus className="size-4" />
                Item
              </Button>
            </div>

            <ul className="space-y-2">
              {form.items.map((row, index) => (
                <li key={`sale-item-${index}`} className="flex items-center gap-2">
                  <select
                    value={row.productId}
                    onChange={(event) => updateItem(index, { productId: event.target.value })}
                    className={cn(
                      "h-10 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm",
                    )}
                  >
                    <option value="">Selecione um produto</option>
                    {menuProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} — {formatCurrency(product.price)}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    min={1}
                    className="w-20"
                    value={row.quantity}
                    onChange={(event) => updateItem(index, { quantity: event.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeItemRow(index)}
                    aria-label="Remover item"
                  >
                    <Trash2 className="size-4 text-muted-foreground" />
                  </Button>
                </li>
              ))}
            </ul>

            <p className="text-sm text-muted-foreground">
              Total: <span className="font-semibold text-foreground">{formatCurrency(total)}</span>
            </p>
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium text-foreground">Pagamento</span>
            <div className="flex gap-2">
              {(["cash", "card"] as const).map((method) => (
                <Button
                  key={method}
                  type="button"
                  variant={form.paymentMethod === method ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPaymentMethod(method)}
                >
                  {method === "cash" ? "Dinheiro" : "Cartão"}
                </Button>
              ))}
            </div>
          </div>

          {form.paymentMethod === "cash" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-foreground">Recebido</span>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.amountReceived}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, amountReceived: event.target.value }))
                  }
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-foreground">Troco</span>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.change}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, change: event.target.value }))
                  }
                />
              </label>
            </div>
          ) : null}

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-foreground">Motivo da correção</span>
            <Input
              value={form.reason}
              onChange={(event) =>
                setForm((current) => ({ ...current, reason: event.target.value }))
              }
              placeholder="Ex.: esqueci de registrar a mesa 5"
            />
          </label>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
