export interface PurchaseRecord {
  id: string;
  productId: string;
  productName: string;
  supplierId: string;
  supplierName: string;
  unitCost: number;
  quantity: number;
  totalCost: number;
  purchasedAt: string;
  notes?: string;
  stockMovementId?: string;
}

export interface PurchaseInput {
  productId: string;
  supplierId: string;
  unitCost: number;
  quantity: number;
  purchasedAt: string;
  notes?: string;
}

export type PurchaseActionResult = { ok: true } | { ok: false; error: string };

export interface ProductMargin {
  amount: number | null;
  percent: number | null;
}

export interface PurchasePriceComparison {
  previousUnitCost: number;
  previousSupplierName: string;
  difference: number;
  percentChange: number;
  isCheaper: boolean;
}

export interface ProductPurchaseInsights {
  bestRecord: PurchaseRecord | null;
  worstRecord: PurchaseRecord | null;
  savingsVsWorst: number | null;
  savingsPercentVsWorst: number | null;
}
