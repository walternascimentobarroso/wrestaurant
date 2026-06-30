import type { MenuCategory } from "../types";
import { apiFetch } from "@/lib/api";
import { isTempId, registerHandler, type SyncMutation } from "@/lib/offline";

import {
  replaceTempCategoryId,
  replaceTempSubcategoryId,
  resolveCategoryId,
  resolveSubcategoryId,
} from "./menuCatalogStorage";

async function handleMenuCatalogMutation(mutation: SyncMutation): Promise<void> {
  switch (mutation.operation) {
    case "createCategory": {
      const tempId = String(mutation.entityId);
      const { name } = mutation.payload as { name: string };
      const created = await apiFetch<MenuCategory>("/menu/categories", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      if (isTempId(tempId)) {
        replaceTempCategoryId(tempId, created.id);
      }
      return;
    }
    case "updateCategory": {
      const categoryId = resolveCategoryId(String(mutation.entityId));
      if (isTempId(categoryId)) {
        throw new Error("Categoria ainda não sincronizada.");
      }
      const { name } = mutation.payload as { name: string };
      await apiFetch<MenuCategory>(`/menu/categories/${categoryId}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      return;
    }
    case "deleteCategory": {
      const categoryId = resolveCategoryId(String(mutation.entityId));
      if (isTempId(categoryId)) {
        return;
      }
      await apiFetch<void>(`/menu/categories/${categoryId}`, { method: "DELETE" });
      return;
    }
    case "createSubcategory": {
      const tempId = String(mutation.entityId);
      const { categoryId, name } = mutation.payload as {
        categoryId: string;
        name: string;
      };
      const resolvedCategoryId = resolveCategoryId(categoryId);
      if (isTempId(resolvedCategoryId)) {
        throw new Error("Categoria ainda não sincronizada.");
      }
      const created = await apiFetch<MenuCategory>(
        `/menu/categories/${resolvedCategoryId}/subcategories`,
        {
          method: "POST",
          body: JSON.stringify({ name }),
        },
      );
      const createdSubcategory = created.subcategories.find(
        (subcategory) => subcategory.name === name,
      );
      if (createdSubcategory && isTempId(tempId)) {
        replaceTempSubcategoryId(tempId, createdSubcategory.id);
      }
      return;
    }
    case "updateSubcategory": {
      const subcategoryId = resolveSubcategoryId(String(mutation.entityId));
      if (isTempId(subcategoryId)) {
        throw new Error("Subcategoria ainda não sincronizada.");
      }
      const { name } = mutation.payload as { name: string };
      await apiFetch<MenuCategory>(`/menu/subcategories/${subcategoryId}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      return;
    }
    case "deleteSubcategory": {
      const subcategoryId = resolveSubcategoryId(String(mutation.entityId));
      if (isTempId(subcategoryId)) {
        return;
      }
      await apiFetch<void>(`/menu/subcategories/${subcategoryId}`, {
        method: "DELETE",
      });
      return;
    }
    default:
      throw new Error(`Operação de menu desconhecida: ${mutation.operation}`);
  }
}

export function registerMenuCatalogSyncHandlers(): void {
  registerHandler("menuCatalog", handleMenuCatalogMutation);
}
