import type {
  ProductPurchaseInsights,
  PurchasePriceComparison,
  PurchaseRecord,
} from "../types";

export function getProductPurchaseHistory(
  records: PurchaseRecord[],
  productId: string,
): PurchaseRecord[] {
  return records
    .filter((record) => record.productId === productId)
    .sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt));
}

export function getSupplierPurchases(
  records: PurchaseRecord[],
  supplierId: string,
): PurchaseRecord[] {
  return records
    .filter((record) => record.supplierId === supplierId)
    .sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt));
}

export function getBestPriceRecord(records: PurchaseRecord[]): PurchaseRecord | null {
  if (records.length === 0) {
    return null;
  }

  return records.reduce((best, current) =>
    current.unitCost < best.unitCost ? current : best,
  );
}

export function getWorstPriceRecord(records: PurchaseRecord[]): PurchaseRecord | null {
  if (records.length === 0) {
    return null;
  }

  return records.reduce((worst, current) =>
    current.unitCost > worst.unitCost ? current : worst,
  );
}

export function getProductPurchaseInsights(
  records: PurchaseRecord[],
  productId: string,
): ProductPurchaseInsights {
  const history = getProductPurchaseHistory(records, productId);
  const bestRecord = getBestPriceRecord(history);
  const worstRecord = getWorstPriceRecord(history);

  if (!bestRecord || !worstRecord || bestRecord.id === worstRecord.id) {
    return {
      bestRecord,
      worstRecord,
      savingsVsWorst: null,
      savingsPercentVsWorst: null,
    };
  }

  const savingsVsWorst = worstRecord.unitCost - bestRecord.unitCost;
  const savingsPercentVsWorst =
    worstRecord.unitCost > 0 ? (savingsVsWorst / worstRecord.unitCost) * 100 : null;

  return {
    bestRecord,
    worstRecord,
    savingsVsWorst,
    savingsPercentVsWorst,
  };
}

export function compareWithLastPurchase(
  currentUnitCost: number,
  records: PurchaseRecord[],
  productId: string,
): PurchasePriceComparison | null {
  const history = getProductPurchaseHistory(records, productId);
  const lastPurchase = history[0];

  if (!lastPurchase) {
    return null;
  }

  const difference = currentUnitCost - lastPurchase.unitCost;
  const percentChange =
    lastPurchase.unitCost > 0 ? (difference / lastPurchase.unitCost) * 100 : 0;

  return {
    previousUnitCost: lastPurchase.unitCost,
    previousSupplierName: lastPurchase.supplierName,
    difference,
    percentChange,
    isCheaper: difference < 0,
  };
}

export function countPurchasesBySupplier(
  records: PurchaseRecord[],
  supplierId: string,
): number {
  return records.filter((record) => record.supplierId === supplierId).length;
}
