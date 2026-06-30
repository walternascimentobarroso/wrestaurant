import { recordPurchaseApi } from "./purchaseStorage";
import type { PurchaseActionResult, PurchaseInput } from "../types";

export function recordPurchase(input: PurchaseInput): PurchaseActionResult {
  void recordPurchaseApi({
    productId: input.productId,
    supplierId: input.supplierId,
    unitCost: input.unitCost,
    quantity: input.quantity,
    purchasedAt: input.purchasedAt,
    notes: input.notes,
  }).catch(() => undefined);

  return { ok: true };
}

export async function recordPurchaseAsync(input: PurchaseInput): Promise<PurchaseActionResult> {
  try {
    await recordPurchaseApi({
      productId: input.productId,
      supplierId: input.supplierId,
      unitCost: input.unitCost,
      quantity: input.quantity,
      purchasedAt: input.purchasedAt,
      notes: input.notes,
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Não foi possível registrar a compra.",
    };
  }
}
