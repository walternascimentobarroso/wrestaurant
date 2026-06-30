import type { Product } from "@/features/tables/types";
import { apiFetch } from "@/lib/api";
import { isTempId, registerHandler, type SyncMutation } from "@/lib/offline";

import { replaceTempProductId, resolveProductId } from "./productStorage";

async function handleProductMutation(mutation: SyncMutation): Promise<void> {
  const productId = resolveProductId(String(mutation.entityId));

  switch (mutation.operation) {
    case "create": {
      const tempId = String(mutation.entityId);
      const created = await apiFetch<Product>("/products", {
        method: "POST",
        body: JSON.stringify(mutation.payload),
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
      await apiFetch<Product>(`/products/${productId}`, {
        method: "PATCH",
        body: JSON.stringify(mutation.payload),
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
