import {
  getProductsSnapshot,
  updateProductApi,
} from "@/features/menu/services/productStorage";
import type { ProductUpdateInput } from "@/features/menu/services/productMutations";
import type { TableOrderItem } from "@/features/tables/types";
import { isIngredient, tracksOwnStock } from "@/features/recipes/utils/productKind";
import type { Product } from "@/features/tables/types";

import { adjustStockApi } from "./stockStorage";
import { deductStockForOrder } from "./stockDeduction";
import type { StockActionResult, StockMovementType } from "../types";
import { isLowStock, isOutOfStock } from "../utils/productStock";
import {
  canAddProductToOrder,
  validateOrderStock as validateOrderStockCore,
} from "../utils/stockValidation";

export { canAddProductToOrder, deductStockForOrder };

export function validateOrderStock(
  items: TableOrderItem[],
  products = getProductsSnapshot(),
): StockActionResult {
  return validateOrderStockCore(items, products);
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

export type StockProductMetadataInput = Pick<
  ProductUpdateInput,
  "name" | "minStock" | "stockUnit" | "packageSize" | "packageUnit"
>;

export async function updateStockProductMetadata(
  productId: string,
  body: StockProductMetadataInput,
): Promise<StockActionResult> {
  try {
    await updateProductApi(productId, body);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Não foi possível atualizar o produto.",
    };
  }
}

export async function setPhysicalInventory(
  productId: string,
  currentQuantity: number,
  targetQuantity: number,
  reason: string,
): Promise<StockActionResult> {
  const delta = targetQuantity - currentQuantity;
  if (delta === 0) {
    return { ok: true };
  }

  return adjustProductStock(productId, delta, "adjustment", reason);
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
