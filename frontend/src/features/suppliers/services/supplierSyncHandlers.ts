import type { Supplier } from "../types";
import { apiFetch } from "@/lib/api";
import { isTempId, registerHandler, type SyncMutation } from "@/lib/offline";

import { replaceTempSupplierId, resolveSupplierId } from "./supplierStorage";

async function handleSupplierMutation(mutation: SyncMutation): Promise<void> {
  const supplierId = resolveSupplierId(String(mutation.entityId));

  switch (mutation.operation) {
    case "create": {
      const tempId = String(mutation.entityId);
      const created = await apiFetch<Supplier>("/suppliers", {
        method: "POST",
        body: JSON.stringify(mutation.payload),
      });
      if (isTempId(tempId)) {
        replaceTempSupplierId(tempId, created.id);
      }
      return;
    }
    case "update": {
      if (isTempId(supplierId)) {
        throw new Error("Fornecedor ainda não sincronizado.");
      }
      await apiFetch<Supplier>(`/suppliers/${supplierId}`, {
        method: "PATCH",
        body: JSON.stringify(mutation.payload),
      });
      return;
    }
    case "delete": {
      if (isTempId(supplierId)) {
        return;
      }
      await apiFetch<void>(`/suppliers/${supplierId}`, { method: "DELETE" });
      return;
    }
    default:
      throw new Error(`Operação de fornecedor desconhecida: ${mutation.operation}`);
  }
}

export function registerSupplierSyncHandlers(): void {
  registerHandler("suppliers", handleSupplierMutation);
}
