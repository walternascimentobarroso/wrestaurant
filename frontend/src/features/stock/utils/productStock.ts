import type { Product } from "@/features/tables/types";

export const DEFAULT_STOCK_QUANTITY = 50;
export const DEFAULT_MIN_STOCK = 5;

export function normalizeProduct(product: Product): Product {
  const kind = product.kind ?? "menu";
  const stockUnit = product.stockUnit ?? "un";
  const packageSize =
    stockUnit === "un" && product.packageSize && product.packageSize > 0
      ? product.packageSize
      : undefined;
  const packageUnit =
    packageSize && product.packageUnit ? product.packageUnit : undefined;

  const recipe =
    kind === "menu" && product.recipe?.length
      ? product.recipe.filter(
          (line) =>
            line.ingredientId &&
            Number.isFinite(line.quantity) &&
            line.quantity > 0,
        )
      : undefined;

  const usesRecipe = kind === "menu" && (recipe?.length ?? 0) > 0;

  return {
    ...product,
    kind,
    stockUnit,
    packageSize,
    packageUnit,
    recipe: usesRecipe ? recipe : undefined,
    trackStock: usesRecipe ? false : (product.trackStock ?? true),
    stockQuantity: product.stockQuantity ?? DEFAULT_STOCK_QUANTITY,
    minStock: product.minStock ?? DEFAULT_MIN_STOCK,
    lastPurchaseCost: product.lastPurchaseCost ?? null,
    preferredSupplierId: product.preferredSupplierId ?? null,
    price: kind === "ingredient" ? 0 : product.price,
  };
}

export function normalizeProducts(products: Product[]): Product[] {
  return products.map(normalizeProduct);
}

export function isOutOfStock(product: Product): boolean {
  return product.trackStock && product.stockQuantity <= 0;
}

export function isLowStock(product: Product): boolean {
  return product.trackStock && product.stockQuantity <= product.minStock;
}

export function getAvailableStock(product: Product): number {
  return product.trackStock ? product.stockQuantity : Number.POSITIVE_INFINITY;
}
