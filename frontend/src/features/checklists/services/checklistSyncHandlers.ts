import type { ChecklistItem } from "../types";
import { apiFetch } from "@/lib/api";
import { isTempId, registerHandler, type SyncMutation } from "@/lib/offline";

import { replaceTempChecklistItemId, resolveChecklistItemId } from "./checklistStorage";

async function handleChecklistMutation(mutation: SyncMutation): Promise<void> {
  switch (mutation.operation) {
    case "toggleCompletion": {
      await apiFetch("/checklists/completions/toggle", {
        method: "POST",
        body: JSON.stringify(mutation.payload),
      });
      return;
    }
    case "create": {
      const tempId = String(mutation.entityId);
      const created = await apiFetch<ChecklistItem>("/checklists/items", {
        method: "POST",
        body: JSON.stringify(mutation.payload),
      });
      if (isTempId(tempId)) {
        replaceTempChecklistItemId(tempId, created.id);
      }
      return;
    }
    case "update": {
      const itemId = resolveChecklistItemId(String(mutation.entityId));
      if (isTempId(itemId)) {
        throw new Error("Item ainda não sincronizado.");
      }
      await apiFetch<ChecklistItem>(`/checklists/items/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify(mutation.payload),
      });
      return;
    }
    case "delete": {
      const itemId = resolveChecklistItemId(String(mutation.entityId));
      if (isTempId(itemId)) {
        return;
      }
      await apiFetch<void>(`/checklists/items/${itemId}`, { method: "DELETE" });
      return;
    }
    case "updateTemplate": {
      await apiFetch(`/checklists/templates/${mutation.entityId}`, {
        method: "PATCH",
        body: JSON.stringify(mutation.payload),
      });
      return;
    }
    case "moveItem": {
      const itemId = resolveChecklistItemId(String(mutation.entityId));
      if (isTempId(itemId)) {
        throw new Error("Item ainda não sincronizado.");
      }
      await apiFetch<ChecklistItem>(`/checklists/items/${itemId}/move`, {
        method: "POST",
        body: JSON.stringify(mutation.payload),
      });
      return;
    }
    default:
      throw new Error(`Operação de checklist desconhecida: ${mutation.operation}`);
  }
}

export function registerChecklistSyncHandlers(): void {
  registerHandler("checklists", handleChecklistMutation);
}
