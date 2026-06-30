import { apiFetch } from "@/lib/api";
import { isTempId, registerHandler, type SyncMutation } from "@/lib/offline";

import { resolveProductId } from "@/features/menu/services/productStorage";
import { linkSaleToPaymentMutation } from "@/features/sales/services/salesSyncHandlers";

import { isTempTableId } from "./tableMutations";
import { applyTableFromServer, replaceTempTableId, resolveTableId } from "./tableStorage";
import type { TableWithDetails } from "../types";

function resolveTableItemProductId(productId: string): string {
  const resolved = resolveProductId(productId);
  if (isTempId(resolved)) {
    throw new Error("Produto ainda não sincronizado.");
  }
  return resolved;
}

async function handleTableMutation(mutation: SyncMutation): Promise<void> {
  const tableId = resolveTableId(Number(mutation.entityId));

  switch (mutation.operation) {
    case "addItem": {
      const { productId } = mutation.payload as { productId: string };
      const updated = await apiFetch<TableWithDetails>(`/tables/${tableId}/items`, {
        method: "POST",
        body: JSON.stringify({
          productId: resolveTableItemProductId(productId),
        }),
      });
      applyTableFromServer(updated);
      return;
    }
    case "removeItem": {
      const { productId } = mutation.payload as { productId: string };
      const updated = await apiFetch<TableWithDetails>(`/tables/${tableId}/items/${resolveTableItemProductId(productId)}`, {
        method: "PATCH",
      });
      applyTableFromServer(updated);
      return;
    }
    case "clearTable": {
      const updated = await apiFetch<TableWithDetails>(`/tables/${tableId}/items`, {
        method: "DELETE",
      });
      applyTableFromServer(updated);
      return;
    }
    case "payment": {
      const response = await apiFetch<{ ok: boolean; saleId?: string }>(
        `/tables/${tableId}/payment`,
        {
          method: "POST",
          body: JSON.stringify(mutation.payload),
        },
      );
      if (response.saleId) {
        linkSaleToPaymentMutation(mutation.id, response.saleId);
      }
      return;
    }
    case "createTable": {
      const tempId = Number(mutation.entityId);
      const body = mutation.payload as { number: number; category: string };
      const created = await apiFetch<TableWithDetails>("/tables", {
        method: "POST",
        body: JSON.stringify(body),
      });
      // Map tempId → serverId in local store and pending queue entries.
      if (isTempTableId(tempId)) {
        replaceTempTableId(tempId, created.id);
      }
      return;
    }
    case "updateTable": {
      if (isTempTableId(tableId)) {
        throw new Error("Mesa ainda não sincronizada.");
      }
      await apiFetch<TableWithDetails>(`/tables/${tableId}`, {
        method: "PATCH",
        body: JSON.stringify(mutation.payload),
      });
      return;
    }
    case "deleteTable": {
      if (isTempTableId(tableId)) {
        return;
      }
      await apiFetch<void>(`/tables/${tableId}`, { method: "DELETE" });
      return;
    }
    default:
      throw new Error(`Operação de mesa desconhecida: ${mutation.operation}`);
  }
}

export function registerTableSyncHandlers(): void {
  registerHandler("tables", handleTableMutation);
}
