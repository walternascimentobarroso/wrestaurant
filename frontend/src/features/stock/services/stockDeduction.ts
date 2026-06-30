import {
  getProductsSnapshot,
  replaceProductsFromServer,
} from "@/features/menu/services/productStorage";
import type { TableOrderItem } from "@/features/tables/types";

import { buildStockMovement } from "./stockMutations";
import { appendStockMovements } from "./stockStorage";
import type { StockActionResult } from "../types";
import { deductStockLocally } from "../utils/stockValidation";

export function deductStockForOrder(
  items: TableOrderItem[],
  referenceId: string,
  products = getProductsSnapshot(),
): StockActionResult {
  try {
    const { products: updatedProducts, movements } = deductStockLocally(
      products,
      items,
      referenceId,
      (product, movementType, delta, quantityAfter, saleReferenceId, reason) =>
        buildStockMovement(product, movementType, delta, quantityAfter, {
          referenceId: saleReferenceId,
          reason,
        }),
    );

    replaceProductsFromServer(updatedProducts);
    appendStockMovements(movements);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Estoque insuficiente.",
    };
  }
}
