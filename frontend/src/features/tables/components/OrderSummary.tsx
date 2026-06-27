"use client";

import { useSettings } from "@/features/settings/hooks/useSettings";

import { FAKE_PRODUCTS } from "../data/fakeProducts";
import type { TableOrderItem } from "../types";

interface OrderSummaryProps {
  items: TableOrderItem[];
  tableNumber: number;
  onRemove: (productId: string) => void;
  onClear: () => void;
}

export function OrderSummary({
  items,
  tableNumber,
  onRemove,
  onClear,
}: OrderSummaryProps) {
  const { formatCurrency } = useSettings();

  const total = items.reduce((sum, item) => {
    const product = FAKE_PRODUCTS.find((p) => p.id === item.productId);
    return sum + (product?.price ?? 0) * item.quantity;
  }, 0);

  const itemCount = items.reduce((count, item) => count + item.quantity, 0);

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-zinc-200 bg-white">
      <div className="shrink-0 border-b border-zinc-200 px-5 py-4">
        <h2 className="text-lg font-bold text-zinc-900">
          Pedido — Mesa {tableNumber}
        </h2>
        {items.length > 0 && (
          <p className="mt-1 text-sm text-zinc-500">
            Toque em um item para remover
          </p>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-5 py-8">
          <p className="text-center text-base text-zinc-400">
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
                    className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition active:scale-[0.98] active:bg-red-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-zinc-900">
                        {product.name}
                      </p>
                      <p className="text-sm text-zinc-500">
                        {item.quantity}x {formatCurrency(product.price)}
                      </p>
                    </div>
                    <p className="shrink-0 text-base font-bold text-zinc-900">
                      {formatCurrency(subtotal)}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="shrink-0 border-t border-zinc-200 px-5 py-4">
            <div className="flex items-center justify-between text-sm text-zinc-500">
              <span>
                {itemCount} {itemCount === 1 ? "item" : "itens"}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-lg font-semibold text-zinc-900">Total</span>
              <span className="text-2xl font-bold text-zinc-900">
                {formatCurrency(total)}
              </span>
            </div>

            <button
              type="button"
              onClick={onClear}
              className="mt-4 flex min-h-14 w-full items-center justify-center rounded-2xl border-2 border-red-200 text-base font-semibold text-red-600 transition active:scale-[0.98] active:bg-red-50"
            >
              Fechar mesa
            </button>
          </div>
        </>
      )}
    </div>
  );
}
