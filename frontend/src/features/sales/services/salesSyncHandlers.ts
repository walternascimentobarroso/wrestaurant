import { registerHandler, type SyncMutation } from "@/lib/offline";

import { buildSaleIdFromMutationId } from "./saleMutations";
import { replaceLocalSaleId } from "./salesStorage";

/**
 * Sales are created on the server via table payment sync.
 * This handler maps local sale ids to server ids after payment succeeds.
 */
async function handleSalesMutation(mutation: SyncMutation): Promise<void> {
  if (mutation.operation !== "create") {
    throw new Error(`Operação de venda desconhecida: ${mutation.operation}`);
  }

  const payload = mutation.payload as { serverSaleId?: string };
  if (payload.serverSaleId) {
    replaceLocalSaleId(buildSaleIdFromMutationId(mutation.id), payload.serverSaleId);
  }
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
