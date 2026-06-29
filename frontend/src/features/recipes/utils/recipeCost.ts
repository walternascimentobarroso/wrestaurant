import type { Product } from "@/features/tables/types";

import {
  convertRecipeToStockUnit,
  formatRecipeAmount,
  getRecipeLineUnit,
} from "@/features/stock/utils/stockUnits";

import { hasRecipe } from "./productKind";

export function calculateRecipeCost(
  product: Product,
  products: Product[],
): number | null {
  if (!hasRecipe(product)) {
    return null;
  }

  let total = 0;
  let hasAnyCost = false;

  for (const line of product.recipe ?? []) {
    const ingredient = products.find((entry) => entry.id === line.ingredientId);
    if (ingredient?.lastPurchaseCost === null || ingredient?.lastPurchaseCost === undefined) {
      continue;
    }

    const unit = getRecipeLineUnit(line, ingredient);
    const consumptionInStockUnit = convertRecipeToStockUnit(line.quantity, unit, ingredient);
    total += consumptionInStockUnit * ingredient.lastPurchaseCost;
    hasAnyCost = true;
  }

  return hasAnyCost ? total : null;
}

export function getRecipeIngredientNames(
  product: Product,
  products: Product[],
): string[] {
  if (!hasRecipe(product)) {
    return [];
  }

  return (product.recipe ?? [])
    .map((line) => products.find((entry) => entry.id === line.ingredientId)?.name)
    .filter((name): name is string => Boolean(name));
}

export function getRecipeIngredientDescription(
  product: Product,
  products: Product[],
): string[] {
  if (!hasRecipe(product)) {
    return [];
  }

  return (product.recipe ?? []).map((line) => {
    const ingredient = products.find((entry) => entry.id === line.ingredientId);
    const unit = ingredient ? getRecipeLineUnit(line, ingredient) : (line.unit ?? "un");
    const name = ingredient?.name ?? "?";
    return `${formatRecipeAmount(line.quantity, unit)} ${name}`;
  });
}
