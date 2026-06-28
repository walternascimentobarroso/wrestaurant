import type { Product } from "@/features/tables/types";

export const DEFAULT_STOCK_QUANTITY = 50;
export const DEFAULT_MIN_STOCK = 5;

export function normalizeProduct(product: Product): Product {
  return {
    ...product,
    trackStock: product.trackStock ?? true,
    stockQuantity: product.stockQuantity ?? DEFAULT_STOCK_QUANTITY,
    minStock: product.minStock ?? DEFAULT_MIN_STOCK,
    lastPurchaseCost: product.lastPurchaseCost ?? null,
    preferredSupplierId: product.preferredSupplierId ?? null,
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
