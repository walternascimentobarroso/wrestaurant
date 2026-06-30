import { generateMutationId } from "@/lib/offline";
import type { Product } from "@/features/tables/types";

import type { StockMovement, StockMovementType } from "../types";

export function buildStockMovement(
  product: Product,
  movementType: StockMovementType,
  delta: number,
  quantityAfter: number,
  options?: {
    referenceId?: string;
    reason?: string;
    supplierId?: string;
    unitCost?: number;
    purchaseRecordId?: string;
    id?: string;
  },
): StockMovement {
  return {
    id: options?.id ?? generateMutationId(),
    productId: product.id,
    productName: product.name,
    type: movementType,
    delta,
    quantityAfter,
    referenceId: options?.referenceId,
    reason: options?.reason,
    supplierId: options?.supplierId,
    unitCost: options?.unitCost,
    purchaseRecordId: options?.purchaseRecordId,
    createdAt: new Date().toISOString(),
  };
}

export function appendMovements(
  movements: StockMovement[],
  entries: StockMovement[],
): StockMovement[] {
  return [...entries, ...movements];
}

export function filterMovementsByProduct(
  movements: StockMovement[],
  productId: string,
): StockMovement[] {
  return movements.filter((movement) => movement.productId === productId);
}

export function applyStockAdjustment(
  products: Product[],
  productId: string,
  delta: number,
): Product[] {
  return products.map((product) => {
    if (product.id !== productId) {
      return product;
    }

    return {
      ...product,
      stockQuantity: product.stockQuantity + delta,
    };
  });
}
