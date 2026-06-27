"use client";

import { useSyncExternalStore } from "react";

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

export function useProductsByCategory(category: string, subcategory: string) {
  const { products } = useProducts();
  return getProductsByCategoryAndSubcategory(products, category, subcategory);
}
