"use client";

import { useSyncExternalStore } from "react";

import { isMenuProduct } from "@/features/recipes/utils/productKind";
import {
  getProductsByCategoryAndSubcategory,
  getProductsServerSnapshot,
  getProductsSnapshot,
  subscribeProducts,
} from "../services/productStorage";

export function useProducts() {
  const products = useSyncExternalStore(
    subscribeProducts,
    getProductsSnapshot,
    getProductsServerSnapshot,
  );

  return { products };
}

export function useMenuProducts() {
  const { products } = useProducts();
  return products.filter(isMenuProduct);
}

export function useIngredients() {
  const { products } = useProducts();
  return products.filter((product) => product.kind === "ingredient");
}

export function useProductsByCategory(category: string, subcategory: string) {
  const { products } = useProducts();
  return getProductsByCategoryAndSubcategory(products, category, subcategory).filter(
    isMenuProduct,
  );
}
