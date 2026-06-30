import type { Payable } from "../types";
import { apiFetch } from "@/lib/api";
import { isTempId, registerHandler, type SyncMutation } from "@/lib/offline";

import { replaceTempPayableId, resolvePayableId } from "./payableStorage";

async function handlePayableMutation(mutation: SyncMutation): Promise<void> {
  const payableId = resolvePayableId(String(mutation.entityId));

  switch (mutation.operation) {
    case "create": {
      const tempId = String(mutation.entityId);
      const created = await apiFetch<Payable>("/payables", {
        method: "POST",
        body: JSON.stringify(mutation.payload),
      });
      if (isTempId(tempId)) {
        replaceTempPayableId(tempId, created.id);
      }
      return;
    }
    case "update": {
      if (isTempId(payableId)) {
        throw new Error("Conta ainda não sincronizada.");
      }
      await apiFetch<Payable>(`/payables/${payableId}`, {
        method: "PATCH",
        body: JSON.stringify(mutation.payload),
      });
      return;
    }
    case "delete": {
      if (isTempId(payableId)) {
        return;
      }
      await apiFetch<void>(`/payables/${payableId}`, { method: "DELETE" });
      return;
    }
    case "markPaid": {
      if (isTempId(payableId)) {
        throw new Error("Conta ainda não sincronizada.");
      }
      await apiFetch<Payable>(`/payables/${payableId}/mark-paid`, {
        method: "POST",
        body: JSON.stringify(mutation.payload),
      });
      return;
    }
    case "markPending": {
      if (isTempId(payableId)) {
        throw new Error("Conta ainda não sincronizada.");
      }
      await apiFetch<Payable>(`/payables/${payableId}/mark-pending`, {
        method: "POST",
      });
      return;
    }
    default:
      throw new Error(`Operação de conta desconhecida: ${mutation.operation}`);
  }
}

export function registerPayableSyncHandlers(): void {
  registerHandler("payables", handlePayableMutation);
}
