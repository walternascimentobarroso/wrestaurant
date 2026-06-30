import {
  getProductsSnapshot,
} from "@/features/menu/services/productStorage";
import {
  expandOrderStockRequirements,
  formatRecipeSources,
} from "@/features/recipes/utils/expandRecipe";
import { isIngredient, tracksOwnStock } from "@/features/recipes/utils/productKind";
import type { Product, TableOrderItem } from "@/features/tables/types";

import { adjustStockApi } from "./stockStorage";
import type { StockActionResult, StockMovementType } from "../types";
import { isLowStock, isOutOfStock } from "../utils/productStock";

export function validateOrderStock(
  items: TableOrderItem[],
  products = getProductsSnapshot(),
): StockActionResult {
  const requirements = expandOrderStockRequirements(
    items,
    products,
  );
  for (const [productId, requirement] of requirements) {
    const stockProduct = products.find((product) => product.id === productId);
    if (!stockProduct) {
      return { ok: false, error: "Insumo da receita não encontrado no cadastro." };
    }

    if (!stockProduct.trackStock) {
      continue;
    }

    if (stockProduct.stockQuantity < requirement.quantity) {
      const sourceLabel = formatRecipeSources(requirement.sources);
      return {
        ok: false,
        error: `Estoque insuficiente: ${stockProduct.name}${sourceLabel ? ` — ${sourceLabel}` : ""}.`,
      };
    }
  }

  return { ok: true };
}

export async function adjustProductStock(
  productId: string,
  delta: number,
  type: StockMovementType,
  reason: string,
): Promise<StockActionResult> {
  try {
    await adjustStockApi({ productId, delta, type, reason });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Não foi possível ajustar o estoque.",
    };
  }
}

export function filterStockProducts(
  products: Product[],
  filter: "all" | "low" | "out",
): Product[] {
  const tracked = products.filter(
    (product) => product.trackStock && (isIngredient(product) || tracksOwnStock(product)),
  );

  switch (filter) {
    case "low":
      return tracked.filter((product) => isLowStock(product) && !isOutOfStock(product));
    case "out":
      return tracked.filter(isOutOfStock);
    default:
      return tracked;
  }
}
