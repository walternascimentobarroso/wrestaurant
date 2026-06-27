"use client";

import { Ban } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useMenuCatalog } from "@/features/menu/hooks/useMenuCatalog";
import { useProducts, useProductsByCategory } from "@/features/menu/hooks/useProducts";
import { getSubcategoryNames } from "@/features/menu/services/menuCatalogStorage";
import { useSettings } from "@/features/settings/hooks/useSettings";
import type { StockActionResult } from "@/features/stock/types";
import { isLowStock, isOutOfStock } from "@/features/stock/utils/productStock";
import { cn } from "@/lib/utils";
import type { Product } from "@/features/tables/types";

import type { TableOrderItem } from "../types";

interface ProductListProps {
  items: TableOrderItem[];
  onAdd: (productId: string) => StockActionResult;
}

export function ProductList({ items, onAdd }: ProductListProps) {
  const { categories } = useMenuCatalog();
  const { products } = useProducts();
  const { formatCurrency } = useSettings();
  const [addError, setAddError] = useState<string | null>(null);

  const categoryNames = categories.map((category) => category.name);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);

  const activeCategory = categoryNames.includes(selectedCategory ?? "")
    ? (selectedCategory as string)
    : (categoryNames[0] ?? "");

  const subcategories = getSubcategoryNames(categories, activeCategory);
  const activeSubcategory = subcategories.includes(selectedSubcategory ?? "")
    ? (selectedSubcategory as string)
    : (subcategories[0] ?? "");

  const categoryProducts = useProductsByCategory(activeCategory, activeSubcategory);

  function handleCategoryChange(category: string) {
    setSelectedCategory(category);
    setSelectedSubcategory(getSubcategoryNames(categories, category)[0] ?? null);
  }

  function handleSubcategoryChange(subcategory: string) {
    setSelectedSubcategory(subcategory);
  }

  function handleAddProduct(productId: string) {
    const result = onAdd(productId);
    if (!result.ok) {
      setAddError(result.error ?? "Não foi possível adicionar o produto.");
      return;
    }
    setAddError(null);
  }

  function getQuantity(productId: string): number {
    return items.find((item) => item.productId === productId)?.quantity ?? 0;
  }

  function countByCategory(category: string): number {
    return items.reduce((count, item) => {
      const product = products.find((entry) => entry.id === item.productId);
      return product?.category === category ? count + item.quantity : count;
    }, 0);
  }

  function countBySubcategory(subcategory: string): number {
    return items.reduce((count, item) => {
      const product = products.find((entry) => entry.id === item.productId);
      return product?.category === activeCategory && product.subcategory === subcategory
        ? count + item.quantity
        : count;
    }, 0);
  }

  if (categoryNames.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-4">
        <p className="text-center text-muted-foreground">
          Nenhuma categoria cadastrada. Configure o cardápio na área administrativa.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {addError ? (
        <div className="mb-3 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {addError}
        </div>
      ) : null}

      <div
        role="tablist"
        aria-label="Categorias do cardápio"
        className="flex shrink-0 gap-2 overflow-x-auto border-b border-border pb-2"
      >
        {categoryNames.map((category) => {
          const isActive = category === activeCategory;
          const categoryCount = countByCategory(category);

          return (
            <Button
              key={category}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => handleCategoryChange(category)}
              variant={isActive ? "default" : "outline"}
              className={cn(
                "h-14 shrink-0 rounded-2xl px-6 text-base font-semibold transition",
                isActive
                  ? "shadow-elevated hover:shadow-elevated-lg"
                  : "bg-card shadow-pressed hover:-translate-y-px hover:shadow-elevated",
              )}
            >
              {category}
              {categoryCount > 0 && (
                <span
                  className={cn(
                    "flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-bold",
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-primary/15 text-primary",
                  )}
                >
                  {categoryCount}
                </span>
              )}
            </Button>
          );
        })}
      </div>

      <div
        role="tablist"
        aria-label="Subcategorias do cardápio"
        className="flex shrink-0 gap-2 overflow-x-auto py-3"
      >
        {subcategories.length === 0 ? (
          <p className="px-1 text-sm text-muted-foreground">
            Nenhuma subcategoria nesta categoria.
          </p>
        ) : (
          subcategories.map((subcategory) => {
            const isActive = subcategory === activeSubcategory;
            const subcategoryCount = countBySubcategory(subcategory);

            return (
              <Button
                key={subcategory}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleSubcategoryChange(subcategory)}
                variant={isActive ? "default" : "outline"}
                className={cn(
                  "h-11 shrink-0 rounded-xl px-4 text-sm font-semibold transition",
                  isActive
                    ? "bg-accent text-accent-foreground shadow-elevated hover:bg-accent/90 hover:shadow-elevated-lg"
                    : "bg-card shadow-pressed hover:-translate-y-px hover:shadow-elevated",
                )}
              >
                {subcategory}
                {subcategoryCount > 0 && (
                  <span
                    className={cn(
                      "flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold",
                      isActive
                        ? "bg-accent-foreground/20 text-accent-foreground"
                        : "bg-accent/15 text-accent",
                    )}
                  >
                    {subcategoryCount}
                  </span>
                )}
              </Button>
            );
          })
        )}
      </div>

      <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto">
        {subcategories.length === 0 ? (
          <div className="flex min-h-40 items-center justify-center px-4">
            <p className="text-center text-muted-foreground">
              Adicione subcategorias na área administrativa para organizar os produtos.
            </p>
          </div>
        ) : categoryProducts.length === 0 ? (
          <div className="flex min-h-40 items-center justify-center px-4">
            <p className="text-center text-muted-foreground">
              Nenhum produto nesta subcategoria.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pb-4 md:grid-cols-3">
            {categoryProducts.map((product) => {
              const quantity = getQuantity(product.id);
              const outOfStock = isOutOfStock(product);
              const lowStock = isLowStock(product) && !outOfStock;
              const orderQuantity = quantity;
              const cannotAdd =
                outOfStock ||
                (product.trackStock && product.stockQuantity <= orderQuantity);

              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  quantity={quantity}
                  outOfStock={outOfStock}
                  lowStock={lowStock}
                  cannotAdd={cannotAdd}
                  formatCurrency={formatCurrency}
                  onAdd={() => handleAddProduct(product.id)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

interface ProductCardProps {
  product: Product;
  quantity: number;
  outOfStock: boolean;
  lowStock: boolean;
  cannotAdd: boolean;
  formatCurrency: (value: number) => string;
  onAdd: () => void;
}

function ProductCard({
  product,
  quantity,
  outOfStock,
  lowStock,
  cannotAdd,
  formatCurrency,
  onAdd,
}: ProductCardProps) {
  return (
    <button
      type="button"
      disabled={cannotAdd}
      onClick={onAdd}
      aria-label={
        lowStock
          ? `${product.name}, estoque baixo, restam ${product.stockQuantity}`
          : outOfStock
            ? `${product.name}, esgotado`
            : product.name
      }
      className={cn(
        "relative flex min-h-[7.5rem] flex-col justify-between rounded-2xl border-2 p-4 text-left shadow-elevated transition",
        outOfStock &&
          "cursor-not-allowed border-destructive/40 bg-muted/50 opacity-80",
        !outOfStock &&
          lowStock &&
          "border-amber-500/70 bg-card hover:-translate-y-0.5 hover:shadow-elevated-lg active:translate-y-px active:scale-[0.98] active:shadow-pressed",
        !outOfStock &&
          !lowStock &&
          !cannotAdd &&
          "hover:-translate-y-0.5 hover:shadow-elevated-lg active:translate-y-px active:scale-[0.98] active:shadow-pressed",
        !outOfStock &&
          !lowStock &&
          quantity > 0 &&
          "border-primary bg-primary/10",
        !outOfStock && !lowStock && quantity === 0 && "border-border bg-card",
      )}
    >
      {lowStock ? (
        <span className="absolute left-3 top-3 rounded-lg bg-amber-500 px-2 py-0.5 text-xs font-bold text-white shadow-sm">
          Restam {product.stockQuantity}
        </span>
      ) : null}

      {outOfStock ? (
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-lg bg-destructive/90 px-2 py-0.5 text-xs font-bold text-white shadow-sm">
          <Ban className="size-3" aria-hidden />
          Esgotado
        </span>
      ) : null}

      {quantity > 0 && !outOfStock ? (
        <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
          {quantity}
        </span>
      ) : null}

      <p
        className={cn(
          "text-base font-semibold leading-snug text-foreground",
          (lowStock || outOfStock) && "pt-7",
          quantity > 0 && !outOfStock && "pr-8",
        )}
      >
        {product.name}
      </p>

      <p className="mt-2 text-lg font-bold text-primary">{formatCurrency(product.price)}</p>
    </button>
  );
}
