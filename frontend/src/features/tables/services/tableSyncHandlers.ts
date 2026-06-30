import { apiFetch } from "@/lib/api";
import { registerHandler, type SyncMutation } from "@/lib/offline";

import { isTempTableId } from "./tableMutations";
import { replaceTempTableId, resolveTableId } from "./tableStorage";
import type { TableWithDetails } from "../types";

async function handleTableMutation(mutation: SyncMutation): Promise<void> {
  const tableId = resolveTableId(Number(mutation.entityId));

  switch (mutation.operation) {
    case "addItem": {
      const { productId } = mutation.payload as { productId: string };
      await apiFetch<TableWithDetails>(`/tables/${tableId}/items`, {
        method: "POST",
        body: JSON.stringify({ productId }),
      });
      return;
    }
    case "removeItem": {
      const { productId } = mutation.payload as { productId: string };
      await apiFetch<TableWithDetails>(`/tables/${tableId}/items/${productId}`, {
        method: "PATCH",
      });
      return;
    }
    case "clearTable": {
      await apiFetch<TableWithDetails>(`/tables/${tableId}/items`, {
        method: "DELETE",
      });
      return;
    }
    case "payment": {
      await apiFetch<{ ok: boolean }>(`/tables/${tableId}/payment`, {
        method: "POST",
        body: JSON.stringify(mutation.payload),
      });
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
