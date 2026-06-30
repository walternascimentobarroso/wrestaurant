"use client";

import { useCallback, useSyncExternalStore } from "react";

import {
  addCategoryApi,
  addSubcategoryApi,
  deleteCategoryApi,
  deleteSubcategoryApi,
  getMenuCatalogServerSnapshot,
  getMenuCatalogSnapshot,
  subscribeMenuCatalog,
  updateCategoryApi,
  updateSubcategoryApi,
} from "../services/menuCatalogStorage";
import type { MenuCatalogActionResult } from "../types";

function normalizeName(value: string): string {
  return value.trim();
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

  const addCategory = useCallback(async (name: string): Promise<MenuCatalogActionResult> => {
    const normalizedName = normalizeName(name);
    const nameError = validateName(normalizedName);
    if (nameError) {
      return { ok: false, error: nameError };
    }

    try {
      await addCategoryApi(normalizedName);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Não foi possível criar a categoria.",
      };
    }
  }, []);

  const updateCategory = useCallback(
    async (categoryId: string, name: string): Promise<MenuCatalogActionResult> => {
      const normalizedName = normalizeName(name);
      const nameError = validateName(normalizedName);
      if (nameError) {
        return { ok: false, error: nameError };
      }

      try {
        await updateCategoryApi(categoryId, normalizedName);
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Não foi possível atualizar a categoria.",
        };
      }
    },
    [],
  );

  const deleteCategory = useCallback(async (categoryId: string): Promise<MenuCatalogActionResult> => {
    try {
      await deleteCategoryApi(categoryId);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Não foi possível excluir a categoria.",
      };
    }
  }, []);

  const addSubcategory = useCallback(
    async (categoryId: string, name: string): Promise<MenuCatalogActionResult> => {
      const normalizedName = normalizeName(name);
      const nameError = validateName(normalizedName);
      if (nameError) {
        return { ok: false, error: nameError };
      }

      try {
        await addSubcategoryApi(categoryId, normalizedName);
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Não foi possível criar a subcategoria.",
        };
      }
    },
    [],
  );

  const updateSubcategory = useCallback(
    async (
      categoryId: string,
      subcategoryId: string,
      name: string,
    ): Promise<MenuCatalogActionResult> => {
      const normalizedName = normalizeName(name);
      const nameError = validateName(normalizedName);
      if (nameError) {
        return { ok: false, error: nameError };
      }

      try {
        await updateSubcategoryApi(subcategoryId, normalizedName);
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Não foi possível atualizar a subcategoria.",
        };
      }
    },
    [],
  );

  const deleteSubcategory = useCallback(
    async (categoryId: string, subcategoryId: string): Promise<MenuCatalogActionResult> => {
      try {
        await deleteSubcategoryApi(subcategoryId);
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Não foi possível excluir a subcategoria.",
        };
      }
    },
    [],
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
