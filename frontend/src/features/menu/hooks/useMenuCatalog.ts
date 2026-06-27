"use client";

import { useCallback, useSyncExternalStore } from "react";

import {
  getMenuCatalogServerSnapshot,
  getMenuCatalogSnapshot,
  persistMenuCatalog,
  subscribeMenuCatalog,
} from "../services/menuCatalogStorage";
import {
  countProductsByCategory,
  countProductsBySubcategory,
  getProductsSnapshot,
  persistProducts,
  renameCategoryInProducts,
  renameSubcategoryInProducts,
} from "../services/productStorage";
import type { MenuCatalogActionResult, MenuCategory } from "../types";

function normalizeName(value: string): string {
  return value.trim();
}

function createCategoryId(): string {
  return `cat-${crypto.randomUUID()}`;
}

function createSubcategoryId(): string {
  return `sub-${crypto.randomUUID()}`;
}

function validateName(value: string): string | null {
  if (!normalizeName(value)) {
    return "Informe um nome válido.";
  }
  return null;
}

export function useMenuCatalog() {
  const categories = useSyncExternalStore(
    subscribeMenuCatalog,
    getMenuCatalogSnapshot,
    getMenuCatalogServerSnapshot,
  );

  const saveCategories = useCallback((nextCategories: MenuCategory[]) => {
    persistMenuCatalog(nextCategories);
  }, []);

  const addCategory = useCallback(
    (name: string): MenuCatalogActionResult => {
      const normalizedName = normalizeName(name);
      const nameError = validateName(normalizedName);
      if (nameError) {
        return { ok: false, error: nameError };
      }

      if (categories.some((category) => category.name.toLowerCase() === normalizedName.toLowerCase())) {
        return { ok: false, error: "Já existe uma categoria com este nome." };
      }

      saveCategories([
        ...categories,
        {
          id: createCategoryId(),
          name: normalizedName,
          subcategories: [],
        },
      ]);

      return { ok: true };
    },
    [categories, saveCategories],
  );

  const updateCategory = useCallback(
    (categoryId: string, name: string): MenuCatalogActionResult => {
      const category = categories.find((entry) => entry.id === categoryId);
      if (!category) {
        return { ok: false, error: "Categoria não encontrada." };
      }

      const normalizedName = normalizeName(name);
      const nameError = validateName(normalizedName);
      if (nameError) {
        return { ok: false, error: nameError };
      }

      if (
        categories.some(
          (entry) =>
            entry.id !== categoryId &&
            entry.name.toLowerCase() === normalizedName.toLowerCase(),
        )
      ) {
        return { ok: false, error: "Já existe uma categoria com este nome." };
      }

      saveCategories(
        categories.map((entry) =>
          entry.id === categoryId ? { ...entry, name: normalizedName } : entry,
        ),
      );

      if (category.name !== normalizedName) {
        const products = getProductsSnapshot();
        persistProducts(renameCategoryInProducts(products, category.name, normalizedName));
      }

      return { ok: true };
    },
    [categories, saveCategories],
  );

  const deleteCategory = useCallback(
    (categoryId: string): MenuCatalogActionResult => {
      const category = categories.find((entry) => entry.id === categoryId);
      if (!category) {
        return { ok: false, error: "Categoria não encontrada." };
      }

      const productCount = countProductsByCategory(getProductsSnapshot(), category.name);
      if (productCount > 0) {
        return {
          ok: false,
          error: `Não é possível excluir: ${productCount} produto(s) usam esta categoria.`,
        };
      }

      saveCategories(categories.filter((entry) => entry.id !== categoryId));
      return { ok: true };
    },
    [categories, saveCategories],
  );

  const addSubcategory = useCallback(
    (categoryId: string, name: string): MenuCatalogActionResult => {
      const category = categories.find((entry) => entry.id === categoryId);
      if (!category) {
        return { ok: false, error: "Categoria não encontrada." };
      }

      const normalizedName = normalizeName(name);
      const nameError = validateName(normalizedName);
      if (nameError) {
        return { ok: false, error: nameError };
      }

      if (
        category.subcategories.some(
          (subcategory) =>
            subcategory.name.toLowerCase() === normalizedName.toLowerCase(),
        )
      ) {
        return { ok: false, error: "Já existe uma subcategoria com este nome." };
      }

      saveCategories(
        categories.map((entry) =>
          entry.id === categoryId
            ? {
                ...entry,
                subcategories: [
                  ...entry.subcategories,
                  { id: createSubcategoryId(), name: normalizedName },
                ],
              }
            : entry,
        ),
      );

      return { ok: true };
    },
    [categories, saveCategories],
  );

  const updateSubcategory = useCallback(
    (
      categoryId: string,
      subcategoryId: string,
      name: string,
    ): MenuCatalogActionResult => {
      const category = categories.find((entry) => entry.id === categoryId);
      if (!category) {
        return { ok: false, error: "Categoria não encontrada." };
      }

      const subcategory = category.subcategories.find((entry) => entry.id === subcategoryId);
      if (!subcategory) {
        return { ok: false, error: "Subcategoria não encontrada." };
      }

      const normalizedName = normalizeName(name);
      const nameError = validateName(normalizedName);
      if (nameError) {
        return { ok: false, error: nameError };
      }

      if (
        category.subcategories.some(
          (entry) =>
            entry.id !== subcategoryId &&
            entry.name.toLowerCase() === normalizedName.toLowerCase(),
        )
      ) {
        return { ok: false, error: "Já existe uma subcategoria com este nome." };
      }

      saveCategories(
        categories.map((entry) =>
          entry.id === categoryId
            ? {
                ...entry,
                subcategories: entry.subcategories.map((item) =>
                  item.id === subcategoryId ? { ...item, name: normalizedName } : item,
                ),
              }
            : entry,
        ),
      );

      if (subcategory.name !== normalizedName) {
        const products = getProductsSnapshot();
        persistProducts(
          renameSubcategoryInProducts(
            products,
            category.name,
            subcategory.name,
            normalizedName,
          ),
        );
      }

      return { ok: true };
    },
    [categories, saveCategories],
  );

  const deleteSubcategory = useCallback(
    (categoryId: string, subcategoryId: string): MenuCatalogActionResult => {
      const category = categories.find((entry) => entry.id === categoryId);
      if (!category) {
        return { ok: false, error: "Categoria não encontrada." };
      }

      const subcategory = category.subcategories.find((entry) => entry.id === subcategoryId);
      if (!subcategory) {
        return { ok: false, error: "Subcategoria não encontrada." };
      }

      const productCount = countProductsBySubcategory(
        getProductsSnapshot(),
        category.name,
        subcategory.name,
      );

      if (productCount > 0) {
        return {
          ok: false,
          error: `Não é possível excluir: ${productCount} produto(s) usam esta subcategoria.`,
        };
      }

      saveCategories(
        categories.map((entry) =>
          entry.id === categoryId
            ? {
                ...entry,
                subcategories: entry.subcategories.filter(
                  (item) => item.id !== subcategoryId,
                ),
              }
            : entry,
        ),
      );

      return { ok: true };
    },
    [categories, saveCategories],
  );

  return {
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    addSubcategory,
    updateSubcategory,
    deleteSubcategory,
  };
}
