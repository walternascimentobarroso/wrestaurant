import type { Product } from "@/features/tables/types";

import { calculateRecipeCost } from "@/features/recipes/utils/recipeCost";
import { hasRecipe } from "@/features/recipes/utils/productKind";

import type { ProductMargin } from "../types";

export function calculateMargin(
  salePrice: number,
  costPrice: number | null | undefined,
): ProductMargin {
  if (costPrice === null || costPrice === undefined) {
    return { amount: null, percent: null };
  }

  const amount = salePrice - costPrice;
  const percent = salePrice > 0 ? (amount / salePrice) * 100 : null;

  return { amount, percent };
}

export function calculateProductMargin(
  product: Product,
  products: Product[] = [],
): ProductMargin {
  if (hasRecipe(product) && products.length > 0) {
    const recipeCost = calculateRecipeCost(product, products);
    if (recipeCost !== null) {
      return calculateMargin(product.price, recipeCost);
    }
  }

  return calculateMargin(product.price, product.lastPurchaseCost);
}

export function getMarginColorClass(margin: ProductMargin): string {
  if (margin.percent === null) {
    return "text-muted-foreground";
  }

  if (margin.percent < 0) {
    return "text-destructive";
  }

  if (margin.percent < 30) {
    return "text-amber-600";
  }

  return "text-emerald-600";
}
