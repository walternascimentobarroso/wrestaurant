import type { Product, RecipeLine, TableOrderItem } from "@/features/tables/types";

import {
  convertRecipeToStockUnit,
  formatStockAmount,
  getRecipeLineUnit,
} from "@/features/stock/utils/stockUnits";

import type { AggregatedStockRequirement, StockRequirement } from "../types";
import { hasRecipe } from "./productKind";

function aggregateOrderQuantities(items: TableOrderItem[]): Map<string, number> {
  const quantities = new Map<string, number>();

  for (const item of items) {
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  }

  return quantities;
}

export function getProductStockDeduction(
  product: Product,
  soldQuantity: number,
  products: Product[],
): StockRequirement[] {
  if (product.kind === "ingredient") {
    return [];
  }

  if (hasRecipe(product)) {
    return (product.recipe ?? []).map((line) => {
      const ingredient = products.find((entry) => entry.id === line.ingredientId);
      const unit = ingredient ? getRecipeLineUnit(line, ingredient) : (line.unit ?? "un");
      const quantity = ingredient
        ? convertRecipeToStockUnit(line.quantity * soldQuantity, unit, ingredient)
        : line.quantity * soldQuantity;

      return {
        productId: line.ingredientId,
        quantity,
        sources: [`${product.name} ×${soldQuantity}`],
      };
    });
  }

  if (product.trackStock) {
    return [
      {
        productId: product.id,
        quantity: soldQuantity,
        sources: [`${product.name} ×${soldQuantity}`],
      },
    ];
  }

  return [];
}

export function expandOrderStockRequirements(
  items: TableOrderItem[],
  products: Product[],
): Map<string, AggregatedStockRequirement> {
  const aggregated = new Map<string, AggregatedStockRequirement>();
  const orderQuantities = aggregateOrderQuantities(items);

  for (const [productId, soldQuantity] of orderQuantities) {
    const product = products.find((entry) => entry.id === productId);
    if (!product) {
      continue;
    }

    const deductions = getProductStockDeduction(product, soldQuantity, products);
    for (const deduction of deductions) {
      const existing = aggregated.get(deduction.productId) ?? {
        quantity: 0,
        sources: [],
      };

      aggregated.set(deduction.productId, {
        quantity: existing.quantity + deduction.quantity,
        sources: [...existing.sources, ...deduction.sources],
      });
    }
  }

  return aggregated;
}

export function getMenuProductMaxServings(product: Product, products: Product[]): number {
  if (product.kind === "ingredient") {
    return 0;
  }

  if (!hasRecipe(product)) {
    if (!product.trackStock) {
      return Number.POSITIVE_INFINITY;
    }

    return Math.floor(product.stockQuantity);
  }

  let minServings = Number.POSITIVE_INFINITY;

  for (const line of product.recipe ?? []) {
    const ingredient = products.find((entry) => entry.id === line.ingredientId);
    if (!ingredient?.trackStock || line.quantity <= 0) {
      continue;
    }

    const unit = getRecipeLineUnit(line, ingredient);
    const consumptionPerServing = convertRecipeToStockUnit(line.quantity, unit, ingredient);
    if (consumptionPerServing <= 0) {
      continue;
    }

    const servings = Math.floor(ingredient.stockQuantity / consumptionPerServing);
    minServings = Math.min(minServings, servings);
  }

  return minServings === Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : minServings;
}

export function formatRecipeSources(sources: string[]): string {
  return [...new Set(sources)].join(", ");
}

export function formatStockRequirement(
  product: Product,
  requiredQuantity: number,
): string {
  return formatStockAmount(product, requiredQuantity);
}

export function normalizeRecipeLines(
  recipe: RecipeLine[] | undefined,
  products: Product[] = [],
): RecipeLine[] {
  if (!recipe?.length) {
    return [];
  }

  const merged = new Map<string, RecipeLine>();

  for (const line of recipe) {
    if (!line.ingredientId || !Number.isFinite(line.quantity) || line.quantity <= 0) {
      continue;
    }

    const ingredient = products.find((entry) => entry.id === line.ingredientId);
    const unit = ingredient ? getRecipeLineUnit(line, ingredient) : (line.unit ?? "un");
    const existing = merged.get(line.ingredientId);

    if (!existing) {
      merged.set(line.ingredientId, {
        ingredientId: line.ingredientId,
        quantity: line.quantity,
        unit,
      });
      continue;
    }

    if (existing.unit === unit) {
      merged.set(line.ingredientId, {
        ...existing,
        quantity: existing.quantity + line.quantity,
      });
      continue;
    }

    if (ingredient) {
      const totalInStockUnit =
        convertRecipeToStockUnit(existing.quantity, existing.unit ?? "un", ingredient) +
        convertRecipeToStockUnit(line.quantity, unit, ingredient);

      merged.set(line.ingredientId, {
        ingredientId: line.ingredientId,
        quantity: totalInStockUnit,
        unit: ingredient.stockUnit ?? "un",
      });
    }
  }

  return [...merged.values()];
}
