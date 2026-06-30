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
import { useProducts } from "@/features/menu/hooks/useProducts";
import { useSettings } from "@/features/settings/hooks/useSettings";

import type { PaymentDetails } from "@/features/sales/types";
import type { StockActionResult } from "@/features/stock/types";
import { validateOrderStock } from "@/features/stock/services/stockService";

import { ReceivePaymentDialog } from "./ReceivePaymentDialog";
import type { TableOrderItem } from "../types";

interface OrderSummaryProps {
  items: TableOrderItem[];
  tableNumber: number;
  onRemove: (productId: string) => void;
  onReceive: (payment: PaymentDetails) => StockActionResult | Promise<StockActionResult>;
}

interface ItemToRemove {
  productId: string;
  name: string;
  quantity: number;
}

export function OrderSummary({
  items,
  tableNumber,
  onRemove,
  onReceive,
}: OrderSummaryProps) {
  const { formatCurrency } = useSettings();
  const { products } = useProducts();
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<ItemToRemove | null>(null);

  const total = items.reduce((sum, item) => {
    const product = products.find((entry) => entry.id === item.productId);
    return sum + (product?.price ?? 0) * item.quantity;
  }, 0);

  const itemCount = items.reduce((count, item) => count + item.quantity, 0);
  const stockValidation = validateOrderStock(items, products);
  const stockWarning = stockValidation.ok ? null : stockValidation.error;

  async function handleConfirmPayment(payment: PaymentDetails): Promise<StockActionResult> {
    return onReceive(payment);
  }

  function handleConfirmRemove() {
    if (!itemToRemove) {
      return;
    }

    onRemove(itemToRemove.productId);
    setItemToRemove(null);
  }

  return (
    <>
      <div className="flex h-full min-h-0 flex-col rounded-2xl border border-border bg-card shadow-elevated">
        <div className="shrink-0 border-b border-border px-5 py-4">
          <h2 className="font-heading text-lg font-bold text-foreground">
            Pedido — Mesa {tableNumber}
          </h2>
          {items.length > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              Toque em um item para remover
            </p>
          )}
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-5 py-8">
            <p className="text-center text-base text-muted-foreground">
              Toque nos produtos para adicionar ao pedido
            </p>
          </div>
        ) : (
          <>
            <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
              {items.map((item) => {
                const product = products.find((entry) => entry.id === item.productId);
                if (!product) {
                  return null;
                }

                const subtotal = product.price * item.quantity;

                return (
                  <li key={item.productId}>
                    <button
                      type="button"
                      onClick={() =>
                        setItemToRemove({
                          productId: item.productId,
                          name: product.name,
                          quantity: item.quantity,
                        })
                      }
                      className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition active:scale-[0.98] active:bg-destructive/10"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-foreground">
                          {product.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity}x {formatCurrency(product.price)}
                        </p>
                      </div>
                      <p className="shrink-0 text-base font-bold text-foreground">
                        {formatCurrency(subtotal)}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="shrink-0 border-t border-border px-5 py-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {itemCount} {itemCount === 1 ? "item" : "itens"}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-lg font-semibold text-foreground">
                  Total
                </span>
                <span className="font-heading text-2xl font-bold text-foreground">
                  {formatCurrency(total)}
                </span>
              </div>

              <Button
                type="button"
                onClick={() => setIsPaymentOpen(true)}
                disabled={Boolean(stockWarning)}
                className="mt-4 h-14 w-full rounded-2xl text-base font-semibold shadow-elevated hover:shadow-elevated-lg"
              >
                Receber
              </Button>
              {stockWarning ? (
                <p className="mt-3 text-sm text-destructive">{stockWarning}</p>
              ) : null}
            </div>
          </>
        )}
      </div>

      <Dialog
        open={itemToRemove !== null}
        onOpenChange={(open) => {
          if (!open) {
            setItemToRemove(null);
          }
        }}
      >
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remover item</DialogTitle>
            <DialogDescription>
              {itemToRemove?.quantity === 1
                ? `Deseja remover "${itemToRemove.name}" do pedido?`
                : `Deseja remover 1 unidade de "${itemToRemove?.name}"? Restarão ${(itemToRemove?.quantity ?? 1) - 1}.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-12 rounded-2xl"
              onClick={() => setItemToRemove(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-12 rounded-2xl"
              onClick={handleConfirmRemove}
            >
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReceivePaymentDialog
        key={isPaymentOpen ? `payment-${total}` : "closed"}
        open={isPaymentOpen}
        onOpenChange={setIsPaymentOpen}
        tableNumber={tableNumber}
        total={total}
        onConfirm={handleConfirmPayment}
      />
    </>
  );
}
