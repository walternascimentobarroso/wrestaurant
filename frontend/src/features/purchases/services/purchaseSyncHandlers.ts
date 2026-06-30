import type { PurchaseRecord } from "../types";
import { apiFetch } from "@/lib/api";
import { isTempId, registerHandler, type SyncMutation } from "@/lib/offline";

import { replaceTempPurchaseId } from "./purchaseStorage";

async function handlePurchaseMutation(mutation: SyncMutation): Promise<void> {
  switch (mutation.operation) {
    case "create": {
      const tempId = String(mutation.entityId);
      const created = await apiFetch<PurchaseRecord>("/purchases", {
        method: "POST",
        body: JSON.stringify(mutation.payload),
      });
      if (isTempId(tempId)) {
        replaceTempPurchaseId(tempId, created.id);
      }
      return;
    }
    default:
      throw new Error(`Operação de compra desconhecida: ${mutation.operation}`);
  }
}

export function registerPurchaseSyncHandlers(): void {
  registerHandler("purchases", handlePurchaseMutation);
}
