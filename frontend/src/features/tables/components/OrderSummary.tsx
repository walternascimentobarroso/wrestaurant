"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useSettings } from "@/features/settings/hooks/useSettings";

import { ReceivePaymentDialog } from "./ReceivePaymentDialog";
import { FAKE_PRODUCTS } from "../data/fakeProducts";
import type { PaymentMethod, TableOrderItem } from "../types";

interface OrderSummaryProps {
  items: TableOrderItem[];
  tableNumber: number;
  onRemove: (productId: string) => void;
  onReceive: (method: PaymentMethod) => void;
}

export function OrderSummary({
  items,
  tableNumber,
  onRemove,
  onReceive,
}: OrderSummaryProps) {
  const { formatCurrency } = useSettings();
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  const total = items.reduce((sum, item) => {
    const product = FAKE_PRODUCTS.find((p) => p.id === item.productId);
    return sum + (product?.price ?? 0) * item.quantity;
  }, 0);

  const itemCount = items.reduce((count, item) => count + item.quantity, 0);

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
                const product = FAKE_PRODUCTS.find(
                  (p) => p.id === item.productId,
                );
                if (!product) {
                  return null;
                }

                const subtotal = product.price * item.quantity;

                return (
                  <li key={item.productId}>
                    <button
                      type="button"
                      onClick={() => onRemove(item.productId)}
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
                className="mt-4 h-14 w-full rounded-2xl text-base font-semibold shadow-elevated hover:shadow-elevated-lg"
              >
                Receber
              </Button>
            </div>
          </>
        )}
      </div>

      <ReceivePaymentDialog
        key={isPaymentOpen ? `payment-${total}` : "closed"}
        open={isPaymentOpen}
        onOpenChange={setIsPaymentOpen}
        tableNumber={tableNumber}
        total={total}
        onConfirm={onReceive}
      />
    </>
  );
}
