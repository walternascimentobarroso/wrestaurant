import {
  getProductsSnapshot,
  persistProducts,
} from "@/features/menu/services/productStorage";
import {
  expandOrderStockRequirements,
  formatRecipeSources,
  formatStockRequirement,
  getMenuProductMaxServings,
  getProductStockDeduction,
} from "@/features/recipes/utils/expandRecipe";
import { isIngredient, tracksOwnStock } from "@/features/recipes/utils/productKind";
import type { Product, TableOrderItem } from "@/features/tables/types";

import { appendStockMovements } from "./stockStorage";
import type { StockActionResult, StockMovement, StockMovementType } from "../types";
import { isLowStock, isOutOfStock } from "../utils/productStock";

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
  const requirements = expandOrderStockRequirements(items, products);

  for (const [productId, requirement] of requirements) {
    const stockProduct = products.find((entry) => entry.id === productId);
    if (!stockProduct) {
      return { ok: false, error: "Insumo da receita não encontrado no cadastro." };
    }

    if (!stockProduct.trackStock) {
      continue;
    }

    if (stockProduct.stockQuantity < requirement.quantity) {
      const sourceLabel = formatRecipeSources(requirement.sources);
      const available = formatStockRequirement(stockProduct, stockProduct.stockQuantity);
      const needed = formatStockRequirement(stockProduct, requirement.quantity);
      return {
        ok: false,
        error: `Estoque insuficiente: ${stockProduct.name} (disponível: ${available}, necessário: ${needed}${sourceLabel ? ` — ${sourceLabel}` : ""}).`,
      };
    }
  }

  return { ok: true };
}

export function canAddProductToOrder(
  product: Product,
  currentQuantityInOrder: number,
  products = getProductsSnapshot(),
): StockActionResult {
  if (isIngredient(product)) {
    return { ok: false, error: "Insumos não podem ser vendidos diretamente." };
  }

  const nextQuantity = currentQuantityInOrder + 1;
  const requirements = getProductStockDeduction(product, nextQuantity, products);

  if (requirements.length === 0) {
    return { ok: true };
  }

  for (const requirement of requirements) {
    const stockProduct = products.find((entry) => entry.id === requirement.productId);
    if (!stockProduct) {
      return { ok: false, error: `Insumo não encontrado na receita de ${product.name}.` };
    }

    if (!stockProduct.trackStock) {
      continue;
    }

    if (stockProduct.stockQuantity < requirement.quantity) {
      const available = formatStockRequirement(stockProduct, stockProduct.stockQuantity);
      const needed = formatStockRequirement(stockProduct, requirement.quantity);
      return {
        ok: false,
        error:
          stockProduct.stockQuantity === 0
            ? `${stockProduct.name} esgotado (necessário para ${product.name}).`
            : `Estoque insuficiente: ${stockProduct.name} (disponível: ${available}, necessário: ${needed}).`,
      };
    }
  }

  const maxServings = getMenuProductMaxServings(product, products);
  if (Number.isFinite(maxServings) && nextQuantity > maxServings) {
    return {
      ok: false,
      error: `Não é possível adicionar mais ${product.name}: insumos insuficientes.`,
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

  const requirements = expandOrderStockRequirements(items, products);
  const movements: StockMovement[] = [];

  const nextProducts = products.map((product) => {
    const requirement = requirements.get(product.id);
    if (!requirement || !product.trackStock) {
      return product;
    }

    const quantityAfter = product.stockQuantity - requirement.quantity;
    movements.push(
      createMovement(
        product,
        "sale",
        -requirement.quantity,
        quantityAfter,
        referenceId,
        formatRecipeSources(requirement.sources),
      ),
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
