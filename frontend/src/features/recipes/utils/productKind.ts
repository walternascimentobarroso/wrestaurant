import type { Product } from "@/features/tables/types";

export function isIngredient(product: Product): boolean {
  return product.kind === "ingredient";
}

export function isMenuProduct(product: Product): boolean {
  return product.kind !== "ingredient";
}

export function hasRecipe(product: Product): boolean {
  return isMenuProduct(product) && (product.recipe?.length ?? 0) > 0;
}

export function tracksOwnStock(product: Product): boolean {
  return product.trackStock && !hasRecipe(product);
}
