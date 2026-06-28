import {
  getProductsSnapshot,
  persistProducts,
} from "@/features/menu/services/productStorage";
import { getSuppliersSnapshot } from "@/features/suppliers/services/supplierStorage";
import { appendStockMovements } from "@/features/stock/services/stockStorage";
import type { StockMovement } from "@/features/stock/types";
import type { Product } from "@/features/tables/types";

import { appendPurchaseRecord } from "./purchaseStorage";
import type { PurchaseActionResult, PurchaseInput, PurchaseRecord } from "../types";

function createPurchaseMovement(
  product: Product,
  delta: number,
  quantityAfter: number,
  purchaseRecord: PurchaseRecord,
): StockMovement {
  return {
    id: crypto.randomUUID(),
    productId: product.id,
    productName: product.name,
    type: "restock",
    delta,
    quantityAfter,
    reason: `Compra: ${purchaseRecord.supplierName}`,
    supplierId: purchaseRecord.supplierId,
    unitCost: purchaseRecord.unitCost,
    purchaseRecordId: purchaseRecord.id,
    createdAt: new Date().toISOString(),
  };
}

export function recordPurchase(input: PurchaseInput): PurchaseActionResult {
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    return { ok: false, error: "Informe uma quantidade válida maior que zero." };
  }

  if (!Number.isFinite(input.unitCost) || input.unitCost < 0) {
    return { ok: false, error: "Informe um preço de compra válido." };
  }

  if (!input.supplierId) {
    return { ok: false, error: "Selecione um fornecedor." };
  }

  if (!input.purchasedAt) {
    return { ok: false, error: "Informe a data da compra." };
  }

  const suppliers = getSuppliersSnapshot();
  const supplier = suppliers.find((entry) => entry.id === input.supplierId);
  if (!supplier) {
    return { ok: false, error: "Fornecedor não encontrado." };
  }

  const products = getProductsSnapshot();
  const product = products.find((entry) => entry.id === input.productId);
  if (!product) {
    return { ok: false, error: "Produto não encontrado." };
  }

  const purchaseRecordId = crypto.randomUUID();
  const stockMovementId = crypto.randomUUID();
  const quantityAfter = product.stockQuantity + input.quantity;
  const normalizedNotes = input.notes?.trim();

  const purchaseRecord: PurchaseRecord = {
    id: purchaseRecordId,
    productId: product.id,
    productName: product.name,
    supplierId: supplier.id,
    supplierName: supplier.name,
    unitCost: input.unitCost,
    quantity: input.quantity,
    totalCost: input.unitCost * input.quantity,
    purchasedAt: new Date(input.purchasedAt).toISOString(),
    notes: normalizedNotes || undefined,
    stockMovementId,
  };

  const movement: StockMovement = {
    ...createPurchaseMovement(product, input.quantity, quantityAfter, purchaseRecord),
    id: stockMovementId,
  };

  persistProducts(
    products.map((entry) =>
      entry.id === product.id
        ? {
            ...entry,
            stockQuantity: quantityAfter,
            lastPurchaseCost: input.unitCost,
            preferredSupplierId: supplier.id,
          }
        : entry,
    ),
  );

  appendPurchaseRecord(purchaseRecord);
  appendStockMovements([movement]);

  return { ok: true };
}
