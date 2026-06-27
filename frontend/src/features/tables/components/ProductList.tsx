"use client";

import { useState } from "react";

import { useSettings } from "@/features/settings/hooks/useSettings";

import { FAKE_PRODUCTS } from "../data/fakeProducts";
import type { TableOrderItem } from "../types";

const CATEGORIES = [...new Set(FAKE_PRODUCTS.map((p) => p.category))];

interface ProductListProps {
  items: TableOrderItem[];
  onAdd: (productId: string) => void;
}

export function ProductList({ items, onAdd }: ProductListProps) {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const { formatCurrency } = useSettings();

  const products = FAKE_PRODUCTS.filter((p) => p.category === activeCategory);

  function getQuantity(productId: string): number {
    return items.find((item) => item.productId === productId)?.quantity ?? 0;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        role="tablist"
        aria-label="Categorias do cardápio"
        className="flex shrink-0 gap-2 overflow-x-auto border-b border-zinc-200 pb-1"
      >
        {CATEGORIES.map((category) => {
          const isActive = category === activeCategory;
          const categoryCount = items.reduce((count, item) => {
            const product = FAKE_PRODUCTS.find((p) => p.id === item.productId);
            return product?.category === category ? count + item.quantity : count;
          }, 0);

          return (
            <button
              key={category}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveCategory(category)}
              className={`relative flex min-h-14 shrink-0 items-center gap-2 rounded-2xl px-6 text-base font-semibold transition active:scale-[0.98] ${
                isActive
                  ? "bg-amber-500 text-white shadow-sm"
                  : "bg-white text-zinc-700 ring-1 ring-zinc-200 active:bg-zinc-100"
              }`}
            >
              {category}
              {categoryCount > 0 && (
                <span
                  className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-bold ${
                    isActive
                      ? "bg-white/25 text-white"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {categoryCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        className="min-h-0 flex-1 overflow-y-auto pt-4"
      >
        <div className="grid grid-cols-2 gap-3 pb-4 md:grid-cols-3">
          {products.map((product) => {
            const quantity = getQuantity(product.id);

            return (
              <button
                key={product.id}
                type="button"
                onClick={() => onAdd(product.id)}
                className={`relative flex min-h-[7.5rem] flex-col justify-between rounded-2xl border-2 p-4 text-left transition active:scale-[0.97] ${
                  quantity > 0
                    ? "border-amber-400 bg-amber-50"
                    : "border-zinc-200 bg-white active:border-amber-300 active:bg-amber-50"
                }`}
              >
                {quantity > 0 && (
                  <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-white">
                    {quantity}
                  </span>
                )}
                <p className="pr-8 text-base font-semibold leading-snug text-zinc-900">
                  {product.name}
                </p>
                <p className="mt-2 text-lg font-bold text-amber-700">
                  {formatCurrency(product.price)}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
