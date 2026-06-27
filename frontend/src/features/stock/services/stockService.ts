import {
  getProductsSnapshot,
  persistProducts,
} from "@/features/menu/services/productStorage";
import type { Product, TableOrderItem } from "@/features/tables/types";

import { appendStockMovements } from "./stockStorage";
import type { StockActionResult, StockMovement, StockMovementType } from "../types";
import { isLowStock, isOutOfStock } from "../utils/productStock";

function aggregateOrderQuantities(items: TableOrderItem[]): Map<string, number> {
  const quantities = new Map<string, number>();

  for (const item of items) {
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  }

  return quantities;
}

function createMovement(
  product: Product,
  type: StockMovementType,
  delta: number,
  quantityAfter: number,
  referenceId?: string,
  reason?: string,
): StockMovement {
  return {
    id: crypto.randomUUID(),
    productId: product.id,
    productName: product.name,
    type,
    delta,
    quantityAfter,
    referenceId,
    reason,
    createdAt: new Date().toISOString(),
  };
}

export function validateOrderStock(
  items: TableOrderItem[],
  products = getProductsSnapshot(),
): StockActionResult {
  const quantities = aggregateOrderQuantities(items);

  for (const [productId, quantity] of quantities) {
    const product = products.find((entry) => entry.id === productId);
    if (!product) {
      return { ok: false, error: "Produto do pedido não encontrado no cardápio." };
    }

    if (!product.trackStock) {
      continue;
    }

    if (product.stockQuantity < quantity) {
      return {
        ok: false,
        error: `Estoque insuficiente: ${product.name} (disponível: ${product.stockQuantity}).`,
      };
    }
  }

  return { ok: true };
}

export function canAddProductToOrder(
  product: Product,
  currentQuantityInOrder: number,
): StockActionResult {
  if (!product.trackStock) {
    return { ok: true };
  }

  if (product.stockQuantity <= currentQuantityInOrder) {
    return {
      ok: false,
      error:
        product.stockQuantity === 0
          ? `${product.name} está esgotado.`
          : `Estoque insuficiente: ${product.name} (disponível: ${product.stockQuantity}).`,
    };
  }

  return { ok: true };
}

export function deductStockForOrder(
  items: TableOrderItem[],
  referenceId: string,
): StockActionResult {
  const products = getProductsSnapshot();
  const validation = validateOrderStock(items, products);
  if (!validation.ok) {
    return validation;
  }

  const quantities = aggregateOrderQuantities(items);
  const movements: StockMovement[] = [];

  const nextProducts = products.map((product) => {
    const quantity = quantities.get(product.id);
    if (!quantity || !product.trackStock) {
      return product;
    }

    const quantityAfter = product.stockQuantity - quantity;
    movements.push(
      createMovement(product, "sale", -quantity, quantityAfter, referenceId),
    );

    return { ...product, stockQuantity: quantityAfter };
  });

  persistProducts(nextProducts);
  appendStockMovements(movements);

  return { ok: true };
}

export function adjustProductStock(
  productId: string,
  delta: number,
  type: StockMovementType,
  reason: string,
): StockActionResult {
  if (!Number.isFinite(delta) || delta === 0) {
    return { ok: false, error: "Informe uma quantidade válida diferente de zero." };
  }

  const normalizedReason = reason.trim();
  if (!normalizedReason) {
    return { ok: false, error: "Informe o motivo do ajuste." };
  }

  const products = getProductsSnapshot();
  const product = products.find((entry) => entry.id === productId);
  if (!product) {
    return { ok: false, error: "Produto não encontrado." };
  }

  const quantityAfter = product.stockQuantity + delta;
  if (quantityAfter < 0) {
    return { ok: false, error: "O estoque não pode ficar negativo." };
  }

  persistProducts(
    products.map((entry) =>
      entry.id === productId ? { ...entry, stockQuantity: quantityAfter } : entry,
    ),
  );

  appendStockMovements([
    createMovement(product, type, delta, quantityAfter, undefined, normalizedReason),
  ]);

  return { ok: true };
}

export function filterStockProducts(
  products: Product[],
  filter: "all" | "low" | "out",
): Product[] {
  const tracked = products.filter((product) => product.trackStock);

  switch (filter) {
    case "low":
      return tracked.filter((product) => isLowStock(product) && !isOutOfStock(product));
    case "out":
      return tracked.filter(isOutOfStock);
    default:
      return tracked;
  }
}
