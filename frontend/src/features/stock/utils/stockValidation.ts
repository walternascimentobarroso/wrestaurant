import {
  expandOrderStockRequirements,
  formatRecipeSources,
  getProductStockDeduction,
} from "@/features/recipes/utils/expandRecipe";
import { isIngredient } from "@/features/recipes/utils/productKind";
import type { Product, TableOrderItem } from "@/features/tables/types";

import type { StockActionResult, StockMovement } from "../types";

function toProductsMap(products: Product[]): Map<string, Product> {
  return new Map(products.map((product) => [product.id, product]));
}

export function canAddProductToOrder(
  product: Product,
  currentQuantity: number,
  products: Product[] | Map<string, Product>,
): StockActionResult {
  const productsMap = products instanceof Map ? products : toProductsMap(products);

  if (isIngredient(product)) {
    return { ok: false, error: "Insumos não podem ser vendidos diretamente." };
  }

  const nextQuantity = currentQuantity + 1;
  const requirements = getProductStockDeduction(
    product,
    nextQuantity,
    [...productsMap.values()],
  );

  if (requirements.length === 0) {
    return { ok: true };
  }

  for (const requirement of requirements) {
    const stockProduct = productsMap.get(requirement.productId);
    if (!stockProduct) {
      return {
        ok: false,
        error: `Insumo não encontrado na receita de ${product.name}.`,
      };
    }

    if (!stockProduct.trackStock) {
      continue;
    }

    if (stockProduct.stockQuantity < requirement.quantity) {
      if (stockProduct.stockQuantity === 0) {
        return {
          ok: false,
          error: `${stockProduct.name} esgotado (necessário para ${product.name}).`,
        };
      }

      return {
        ok: false,
        error:
          `Estoque insuficiente: ${stockProduct.name} ` +
          `(disponível: ${stockProduct.stockQuantity}, necessário: ${requirement.quantity}).`,
      };
    }
  }

  return { ok: true };
}

export function validateOrderStock(
  items: TableOrderItem[],
  products: Product[] | Map<string, Product>,
): StockActionResult {
  const productsMap = products instanceof Map ? products : toProductsMap(products);
  const requirements = expandOrderStockRequirements(items, [...productsMap.values()]);

  for (const [productId, requirement] of requirements) {
    const stockProduct = productsMap.get(productId);
    if (!stockProduct) {
      return { ok: false, error: "Insumo da receita não encontrado no cadastro." };
    }

    if (!stockProduct.trackStock) {
      continue;
    }

    if (stockProduct.stockQuantity < requirement.quantity) {
      const sourceLabel = formatRecipeSources(requirement.sources);
      const suffix = sourceLabel ? ` — ${sourceLabel}` : "";
      return {
        ok: false,
        error:
          `Estoque insuficiente: ${stockProduct.name} ` +
          `(disponível: ${stockProduct.stockQuantity}, ` +
          `necessário: ${requirement.quantity}${suffix}).`,
      };
    }
  }

  return { ok: true };
}

export interface StockDeductionResult {
  products: Product[];
  movements: StockMovement[];
}

export function deductStockLocally(
  products: Product[],
  items: TableOrderItem[],
  referenceId: string,
  buildMovement: (
    product: Product,
    movementType: "sale",
    delta: number,
    quantityAfter: number,
    referenceId: string,
    reason?: string,
  ) => StockMovement,
): StockDeductionResult {
  const validation = validateOrderStock(items, products);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const requirements = expandOrderStockRequirements(items, products);
  const updatedProducts = products.map((product) => ({ ...product }));
  const productsMap = toProductsMap(updatedProducts);
  const movements: StockMovement[] = [];

  for (const [productId, requirement] of requirements) {
    const product = productsMap.get(productId);
    if (!product?.trackStock) {
      continue;
    }

    const quantityAfter = product.stockQuantity - requirement.quantity;
    product.stockQuantity = quantityAfter;
    movements.push(
      buildMovement(
        product,
        "sale",
        -requirement.quantity,
        quantityAfter,
        referenceId,
        formatRecipeSources(requirement.sources),
      ),
    );
  }

  return { products: updatedProducts, movements };
}
