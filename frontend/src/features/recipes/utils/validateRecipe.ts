import type { Product, RecipeLine } from "@/features/tables/types";

import {
  areUnitsCompatible,
  getRecipeLineUnit,
} from "@/features/stock/utils/stockUnits";

import { normalizeRecipeLines } from "./expandRecipe";
import { isIngredient } from "./productKind";

export function validateRecipe(
  recipe: RecipeLine[] | undefined,
  products: Product[],
  menuProductId?: string,
): string | null {
  const normalized = normalizeRecipeLines(recipe, products);

  if (normalized.length === 0) {
    return "Adicione pelo menos um insumo à ficha técnica.";
  }

  for (const line of normalized) {
    if (line.ingredientId === menuProductId) {
      return "Um produto não pode usar a si mesmo como insumo.";
    }

    const ingredient = products.find((entry) => entry.id === line.ingredientId);
    if (!ingredient) {
      return "Selecione insumos válidos na ficha técnica.";
    }

    if (!isIngredient(ingredient)) {
      return `"${ingredient.name}" não é um insumo. Apenas insumos podem compor receitas.`;
    }

    const unit = getRecipeLineUnit(line, ingredient);
    if (!areUnitsCompatible(unit, ingredient)) {
      return `A unidade "${unit}" não é compatível com o estoque de "${ingredient.name}".`;
    }
  }

  return null;
}

export function isIngredientUsedInRecipes(
  ingredientId: string,
  products: Product[],
): boolean {
  return products.some(
    (product) =>
      product.kind !== "ingredient" &&
      (product.recipe ?? []).some((line) => line.ingredientId === ingredientId),
  );
}
