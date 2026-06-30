import type { Product } from "@/features/tables/types";
import { apiFetch } from "@/lib/api";
import { isTempId, registerHandler, syncQueue, type SyncMutation } from "@/lib/offline";

import type { ProductCreateInput } from "./productMutations";
import {
  getProductsSnapshot,
  replaceTempProductId,
  repairPendingProductPayloadsFromCache,
  resolveProductId,
} from "./productStorage";

function resolveRecipeIngredientIds(
  payload: ProductCreateInput,
): ProductCreateInput {
  if (!payload.recipe?.length) {
    return payload;
  }

  const recipe = payload.recipe.map((line) => ({
    ...line,
    ingredientId: resolveProductId(line.ingredientId),
  }));

  if (recipe.some((line) => isTempId(line.ingredientId))) {
    const unresolved = recipe
      .filter((line) => isTempId(line.ingredientId))
      .map((line) => line.ingredientId);
    const pending = unresolved.some((ingredientId) =>
      syncQueue.findPendingMutation("products", ingredientId, "create"),
    );
    if (pending) {
      throw new Error("Insumo ainda não sincronizado.");
    }
    throw new Error(
      `Insumo não encontrado no servidor (${unresolved.join(", ")}). Descarte e cadastre o produto novamente.`,
    );
  }

  return { ...payload, recipe };
}

function buildProductSyncPayload(mutation: SyncMutation): ProductCreateInput {
  repairPendingProductPayloadsFromCache();

  const queued = mutation.payload as ProductCreateInput;
  const entityId = String(mutation.entityId);
  const local = getProductsSnapshot().find(
    (product) => product.id === entityId || product.id === resolveProductId(entityId),
  );

  if (!local) {
    return resolveRecipeIngredientIds(queued);
  }

  return resolveRecipeIngredientIds({
    name: local.name,
    price: local.price,
    category: local.category,
    subcategory: local.subcategory,
    kind: local.kind,
    recipe: local.recipe?.map((line) => ({
      ingredientId: line.ingredientId,
      quantity: line.quantity,
      unit: line.unit,
    })),
    trackStock: local.trackStock,
    stockQuantity: local.stockQuantity,
    minStock: local.minStock,
    stockUnit: local.stockUnit ?? "un",
    packageSize: local.packageSize,
    packageUnit: local.packageUnit,
  });
}

async function handleProductMutation(mutation: SyncMutation): Promise<void> {
  const productId = resolveProductId(String(mutation.entityId));

  switch (mutation.operation) {
    case "create": {
      const tempId = String(mutation.entityId);
      const payload = buildProductSyncPayload(mutation);
      const created = await apiFetch<Product>("/products", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (isTempId(tempId)) {
        replaceTempProductId(tempId, created.id);
      }
      return;
    }
    case "update": {
      if (isTempId(productId)) {
        throw new Error("Produto ainda não sincronizado.");
      }
      const payload = buildProductSyncPayload(mutation);
      await apiFetch<Product>(`/products/${productId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      return;
    }
    case "delete": {
      if (isTempId(productId)) {
        return;
      }
      await apiFetch<void>(`/products/${productId}`, { method: "DELETE" });
      return;
    }
    default:
      throw new Error(`Operação de produto desconhecida: ${mutation.operation}`);
  }
}

export function registerProductSyncHandlers(): void {
  registerHandler("products", handleProductMutation);
}
