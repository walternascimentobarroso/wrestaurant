"use client";

import { useCallback, useSyncExternalStore } from "react";

import { normalizeRecipeLines } from "@/features/recipes/utils/expandRecipe";
import { isIngredient } from "@/features/recipes/utils/productKind";
import {
  isIngredientUsedInRecipes,
  validateRecipe,
} from "@/features/recipes/utils/validateRecipe";
import { getTablesSnapshot } from "@/features/tables/services/tableStorage";
import type { Product, ProductKind, RecipeLine, StockUnit } from "@/features/tables/types";

import {
  createProductApi,
  deleteProductApi,
  getProductsServerSnapshot,
  getProductsSnapshot,
  subscribeProducts,
  updateProductApi,
} from "../services/productStorage";
import type { MenuCatalogActionResult } from "../types";

export interface ProductInput {
  name: string;
  price: number;
  category: string;
  subcategory: string;
  kind: ProductKind;
  recipe?: RecipeLine[];
  trackStock: boolean;
  stockQuantity: number;
  minStock: number;
  stockUnit: StockUnit;
  usesPackage: boolean;
  packageSize?: number;
  packageUnit?: StockUnit;
}

function normalizeName(value: string): string {
  return value.trim();
}

function isProductInActiveOrders(productId: string): boolean {
  return getTablesSnapshot().some((table) =>
    table.items.some((item) => item.productId === productId),
  );
}

function isIngredientInput(input: ProductInput): boolean {
  return input.kind === "ingredient";
}

function usesRecipe(input: ProductInput, products: Product[]): boolean {
  return input.kind === "menu" && normalizeRecipeLines(input.recipe, products).length > 0;
}

function buildUnitFields(
  input: ProductInput,
): Pick<Product, "stockUnit" | "packageSize" | "packageUnit"> {
  const stockUnit = input.stockUnit ?? "un";

  if (stockUnit === "un" && input.usesPackage && input.packageSize && input.packageUnit) {
    return {
      stockUnit,
      packageSize: input.packageSize,
      packageUnit: input.packageUnit,
    };
  }

  return {
    stockUnit,
    packageSize: undefined,
    packageUnit: undefined,
  };
}

function validateStockFields(input: ProductInput): string | null {
  const tracksStock = isIngredientInput(input) || (input.kind === "menu" && input.trackStock);

  if (tracksStock && (!Number.isFinite(input.stockQuantity) || input.stockQuantity < 0)) {
    return "Informe um estoque válido (zero ou maior).";
  }

  if (tracksStock && (!Number.isFinite(input.minStock) || input.minStock < 0)) {
    return "Informe um estoque mínimo válido (zero ou maior).";
  }

  return null;
}

function validateUnitFields(input: ProductInput): string | null {
  if (!isIngredientInput(input) && !(input.kind === "menu" && input.trackStock)) {
    return null;
  }

  if (input.stockUnit === "un" && input.usesPackage) {
    if (!input.packageSize || input.packageSize <= 0) {
      return "Informe o tamanho da embalagem (ex.: 70 para garrafa de 70 cl).";
    }

    if (!input.packageUnit) {
      return "Selecione a unidade da embalagem.";
    }
  }

  return null;
}

function buildProductFields(
  input: ProductInput,
  products: Product[],
): Pick<
  Product,
  | "kind"
  | "recipe"
  | "trackStock"
  | "stockQuantity"
  | "minStock"
  | "price"
  | "stockUnit"
  | "packageSize"
  | "packageUnit"
> {
  const unitFields = buildUnitFields(input);
  const recipe = usesRecipe(input, products)
    ? normalizeRecipeLines(input.recipe, products)
    : undefined;
  const ingredient = isIngredientInput(input);

  if (ingredient) {
    return {
      kind: "ingredient",
      recipe: undefined,
      trackStock: true,
      stockQuantity: input.stockQuantity,
      minStock: input.minStock,
      price: 0,
      ...unitFields,
    };
  }

  if (recipe && recipe.length > 0) {
    return {
      kind: "menu",
      recipe,
      trackStock: false,
      stockQuantity: 0,
      minStock: 0,
      price: input.price,
      stockUnit: "un",
      packageSize: undefined,
      packageUnit: undefined,
    };
  }

  return {
    kind: "menu",
    recipe: undefined,
    trackStock: input.trackStock,
    stockQuantity: input.trackStock ? input.stockQuantity : 0,
    minStock: input.trackStock ? input.minStock : 0,
    price: input.price,
    ...unitFields,
  };
}

function buildApiPayload(input: ProductInput, products: Product[]) {
  const fields = buildProductFields(input, products);
  return {
    name: normalizeName(input.name),
    price: fields.price,
    category: input.category,
    subcategory: input.subcategory,
    kind: fields.kind,
    recipe: fields.recipe?.map((line) => ({
      ingredientId: line.ingredientId,
      quantity: line.quantity,
      unit: line.unit,
    })),
    trackStock: fields.trackStock,
    stockQuantity: fields.stockQuantity,
    minStock: fields.minStock,
    stockUnit: fields.stockUnit ?? "un",
    packageSize: fields.packageSize,
    packageUnit: fields.packageUnit,
  };
}

export function useProductAdmin() {
  const products = useSyncExternalStore(
    subscribeProducts,
    getProductsSnapshot,
    getProductsServerSnapshot,
  );

  const createProduct = useCallback(
    async (input: ProductInput): Promise<MenuCatalogActionResult> => {
      const name = normalizeName(input.name);
      if (!name) {
        return { ok: false, error: "Informe o nome do produto." };
      }

      if (!isIngredientInput(input)) {
        if (!Number.isFinite(input.price) || input.price <= 0) {
          return { ok: false, error: "Informe um preço válido maior que zero." };
        }
      }

      if (!input.category || !input.subcategory) {
        return { ok: false, error: "Selecione categoria e subcategoria." };
      }

      const stockError = validateStockFields(input);
      if (stockError) {
        return { ok: false, error: stockError };
      }

      const unitError = validateUnitFields(input);
      if (unitError) {
        return { ok: false, error: unitError };
      }

      if (usesRecipe(input, products)) {
        const recipeError = validateRecipe(input.recipe, products);
        if (recipeError) {
          return { ok: false, error: recipeError };
        }
      }

      try {
        await createProductApi(buildApiPayload(input, products));
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Não foi possível salvar o produto.",
        };
      }
    },
    [products],
  );

  const updateProduct = useCallback(
    async (productId: string, input: ProductInput): Promise<MenuCatalogActionResult> => {
      const product = products.find((entry) => entry.id === productId);
      if (!product) {
        return { ok: false, error: "Produto não encontrado." };
      }

      const name = normalizeName(input.name);
      if (!name) {
        return { ok: false, error: "Informe o nome do produto." };
      }

      if (!isIngredientInput(input)) {
        if (!Number.isFinite(input.price) || input.price <= 0) {
          return { ok: false, error: "Informe um preço válido maior que zero." };
        }
      }

      if (!input.category || !input.subcategory) {
        return { ok: false, error: "Selecione categoria e subcategoria." };
      }

      const stockError = validateStockFields(input);
      if (stockError) {
        return { ok: false, error: stockError };
      }

      const unitError = validateUnitFields(input);
      if (unitError) {
        return { ok: false, error: unitError };
      }

      if (usesRecipe(input, products)) {
        const recipeError = validateRecipe(input.recipe, products, productId);
        if (recipeError) {
          return { ok: false, error: recipeError };
        }
      }

      try {
        await updateProductApi(productId, buildApiPayload(input, products));
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Não foi possível salvar o produto.",
        };
      }
    },
    [products],
  );

  const deleteProduct = useCallback(
    async (productId: string): Promise<MenuCatalogActionResult> => {
      const product = products.find((entry) => entry.id === productId);
      if (!product) {
        return { ok: false, error: "Produto não encontrado." };
      }

      if (isProductInActiveOrders(productId)) {
        return {
          ok: false,
          error: "Não é possível excluir: produto está em um pedido aberto.",
        };
      }

      if (isIngredient(product) && isIngredientUsedInRecipes(productId, products)) {
        return {
          ok: false,
          error: "Não é possível excluir: insumo usado em fichas técnicas.",
        };
      }

      try {
        await deleteProductApi(productId);
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Não foi possível excluir o produto.",
        };
      }
    },
    [products],
  );

  return {
    products,
    createProduct,
    updateProduct,
    deleteProduct,
  };
}
