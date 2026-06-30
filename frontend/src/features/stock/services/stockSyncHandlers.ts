import type { StockMovement } from "../types";
import { apiFetch } from "@/lib/api";
import { registerHandler, SYNC_MAX_RETRIES, type SyncMutation } from "@/lib/offline";

async function handleStockMutation(mutation: SyncMutation): Promise<void> {
  switch (mutation.operation) {
    case "adjust": {
      try {
        await apiFetch<StockMovement>("/stock/adjustments", {
          method: "POST",
          body: JSON.stringify(mutation.payload),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erro ao ajustar estoque.";
        const updated = mutation.retries + 1;
        if (updated >= SYNC_MAX_RETRIES) {
          console.error(
            `[sync:stock] Ajuste rejeitado permanentemente (${mutation.entityId}): ${message}`,
          );
        }
        throw error;
      }
      return;
    }
    default:
      throw new Error(`Operação de estoque desconhecida: ${mutation.operation}`);
  }
}

export function registerStockSyncHandlers(): void {
  registerHandler("stock", handleStockMutation);
}
