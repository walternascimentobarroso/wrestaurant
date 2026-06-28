export type StockMovementType = "sale" | "adjustment" | "restock";

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: StockMovementType;
  delta: number;
  quantityAfter: number;
  referenceId?: string;
  reason?: string;
  supplierId?: string;
  unitCost?: number;
  purchaseRecordId?: string;
  createdAt: string;
}

export type StockActionResult = { ok: true } | { ok: false; error: string };

export type StockFilter = "all" | "low" | "out";
