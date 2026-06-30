import type { Product } from "@/features/tables/types";
import type { Supplier } from "@/features/suppliers/types";

import type { PurchaseInput, PurchaseRecord } from "../types";

export function buildPurchaseRecord(
  input: PurchaseInput,
  id: string,
  product: Product,
  supplier: Supplier,
): PurchaseRecord {
  return {
    id,
    productId: product.id,
    productName: product.name,
    supplierId: supplier.id,
    supplierName: supplier.name,
    unitCost: input.unitCost,
    quantity: input.quantity,
    totalCost: input.unitCost * input.quantity,
    purchasedAt: input.purchasedAt,
    notes: input.notes?.trim() || undefined,
  };
}

export function appendPurchase(
  records: PurchaseRecord[],
  record: PurchaseRecord,
): PurchaseRecord[] {
  return [record, ...records].sort(
    (a, b) =>
      new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime(),
  );
}

export function applyPurchaseToProduct(
  products: Product[],
  productId: string,
  quantity: number,
  unitCost: number,
  supplierId: string,
): Product[] {
  return products.map((product) => {
    if (product.id !== productId) {
      return product;
    }

    return {
      ...product,
      stockQuantity: product.stockQuantity + quantity,
      lastPurchaseCost: unitCost,
      preferredSupplierId: supplierId,
    };
  });
}

export function replacePurchaseId(
  records: PurchaseRecord[],
  oldId: string,
  newId: string,
): PurchaseRecord[] {
  return records.map((record) =>
    record.id === oldId ? { ...record, id: newId } : record,
  );
}
