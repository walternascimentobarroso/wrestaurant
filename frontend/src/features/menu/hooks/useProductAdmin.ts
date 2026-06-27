"use client";

import { useCallback, useSyncExternalStore } from "react";

import { getTablesSnapshot } from "@/features/tables/services/tableStorage";
import type { Product } from "@/features/tables/types";

import {
  getProductsServerSnapshot,
  getProductsSnapshot,
  persistProducts,
  subscribeProducts,
} from "../services/productStorage";
import type { MenuCatalogActionResult } from "../types";

export interface ProductInput {
  name: string;
  price: number;
  category: string;
  subcategory: string;
  trackStock: boolean;
  stockQuantity: number;
  minStock: number;
}

function normalizeName(value: string): string {
  return value.trim();
}

function createProductId(): string {
  return `p-${crypto.randomUUID()}`;
}

function isProductInActiveOrders(productId: string): boolean {
  return getTablesSnapshot().some((table) =>
    table.items.some((item) => item.productId === productId),
  );
}

function validateStockFields(input: ProductInput): string | null {
  if (input.trackStock && (!Number.isFinite(input.stockQuantity) || input.stockQuantity < 0)) {
    return "Informe um estoque válido (zero ou maior).";
  }

  if (input.trackStock && (!Number.isFinite(input.minStock) || input.minStock < 0)) {
    return "Informe um estoque mínimo válido (zero ou maior).";
  }

  return null;
}

function buildProductFields(input: ProductInput): Pick<
  Product,
  "trackStock" | "stockQuantity" | "minStock"
> {
  return {
    trackStock: input.trackStock,
    stockQuantity: input.trackStock ? input.stockQuantity : 0,
    minStock: input.trackStock ? input.minStock : 0,
  };
}

export function useProductAdmin() {
  const products = useSyncExternalStore(
    subscribeProducts,
    getProductsSnapshot,
    getProductsServerSnapshot,
  );

  const saveProducts = useCallback((nextProducts: Product[]) => {
    persistProducts(nextProducts);
  }, []);

  const createProduct = useCallback(
    (input: ProductInput): MenuCatalogActionResult => {
      const name = normalizeName(input.name);
      if (!name) {
        return { ok: false, error: "Informe o nome do produto." };
      }

      if (!Number.isFinite(input.price) || input.price <= 0) {
        return { ok: false, error: "Informe um preço válido maior que zero." };
      }

      if (!input.category || !input.subcategory) {
        return { ok: false, error: "Selecione categoria e subcategoria." };
      }

      const stockError = validateStockFields(input);
      if (stockError) {
        return { ok: false, error: stockError };
      }

      const newProduct: Product = {
        id: createProductId(),
        name,
        price: input.price,
        category: input.category,
        subcategory: input.subcategory,
        ...buildProductFields(input),
      };

      saveProducts([newProduct, ...products]);
      return { ok: true };
    },
    [products, saveProducts],
  );

  const updateProduct = useCallback(
    (productId: string, input: ProductInput): MenuCatalogActionResult => {
      const product = products.find((entry) => entry.id === productId);
      if (!product) {
        return { ok: false, error: "Produto não encontrado." };
      }

      const name = normalizeName(input.name);
      if (!name) {
        return { ok: false, error: "Informe o nome do produto." };
      }

      if (!Number.isFinite(input.price) || input.price <= 0) {
        return { ok: false, error: "Informe um preço válido maior que zero." };
      }

      if (!input.category || !input.subcategory) {
        return { ok: false, error: "Selecione categoria e subcategoria." };
      }

      const stockError = validateStockFields(input);
      if (stockError) {
        return { ok: false, error: stockError };
      }

      saveProducts(
        products.map((entry) =>
          entry.id === productId
            ? {
                ...entry,
                name,
                price: input.price,
                category: input.category,
                subcategory: input.subcategory,
                ...buildProductFields(input),
              }
            : entry,
        ),
      );

      return { ok: true };
    },
    [products, saveProducts],
  );

  const deleteProduct = useCallback(
    (productId: string): MenuCatalogActionResult => {
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

      saveProducts(products.filter((entry) => entry.id !== productId));
      return { ok: true };
    },
    [products, saveProducts],
  );

  return {
    products,
    createProduct,
    updateProduct,
    deleteProduct,
  };
}
