import type { Sale } from "../types";
import { apiFetch } from "@/lib/api";
import { isTempId, registerHandler, type SyncMutation } from "@/lib/offline";

import { buildSaleIdFromMutationId } from "./saleMutations";
import { replaceLocalSaleId, replaceTempSaleId, resolveSaleId } from "./salesStorage";

async function handleSalesMutation(mutation: SyncMutation): Promise<void> {
  if (mutation.operation === "create") {
    const payload = mutation.payload as { serverSaleId?: string };
    if (payload.serverSaleId) {
      replaceLocalSaleId(buildSaleIdFromMutationId(mutation.id), payload.serverSaleId);
      return;
    }

    const tempId = String(mutation.entityId);
    const created = await apiFetch<Sale>("/sales", {
      method: "POST",
      body: JSON.stringify(mutation.payload),
    });
    if (isTempId(tempId)) {
      replaceTempSaleId(tempId, created.id);
    }
    return;
  }

  if (mutation.operation === "update") {
    const saleId = resolveSaleId(String(mutation.entityId));
    if (isTempId(saleId)) {
      throw new Error("Venda ainda não sincronizada.");
    }
    await apiFetch<Sale>(`/sales/${saleId}`, {
      method: "PATCH",
      body: JSON.stringify(mutation.payload),
    });
    return;
  }

  if (mutation.operation === "delete") {
    const saleId = resolveSaleId(String(mutation.entityId));
    if (isTempId(saleId)) {
      return;
    }
    const { reason } = mutation.payload as { reason: string };
    const query = new URLSearchParams({ reason });
    await apiFetch<void>(`/sales/${saleId}?${query.toString()}`, {
      method: "DELETE",
    });
    return;
  }

  throw new Error(`Operação de venda desconhecida: ${mutation.operation}`);
}

export function registerSalesSyncHandlers(): void {
  registerHandler("sales", handleSalesMutation);
}

export function linkSaleToPaymentMutation(
  paymentMutationId: string,
  serverSaleId: string,
): void {
  replaceLocalSaleId(buildSaleIdFromMutationId(paymentMutationId), serverSaleId);
}
