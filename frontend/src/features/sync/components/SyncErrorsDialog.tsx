"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SyncEntity, SyncMutation } from "@/lib/offline";

const ENTITY_LABELS: Record<SyncEntity, string> = {
  tables: "Mesas",
  products: "Produtos",
  menuCatalog: "Cardápio",
  settings: "Configurações",
  sales: "Vendas",
  payables: "Contas a pagar",
  suppliers: "Fornecedores",
  purchases: "Compras",
  stock: "Estoque",
  checklists: "Checklists",
};

interface SyncErrorsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  errors: SyncMutation[];
  onRetry: (mutationId: string) => void;
  onRetryAll: () => void;
  onDiscard: (mutationId: string) => void;
}

export function SyncErrorsDialog({
  open,
  onOpenChange,
  errors,
  onRetry,
  onRetryAll,
  onDiscard,
}: SyncErrorsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(85vh,640px)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Erros de sincronização</DialogTitle>
          <DialogDescription>
            Operações que não puderam ser enviadas ao servidor. Tente novamente ou
            descarte para remover da fila.
          </DialogDescription>
        </DialogHeader>

        {errors.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum erro pendente.</p>
        ) : (
          <ul className="space-y-3">
            {errors.map((mutation) => (
              <li
                key={mutation.id}
                className="rounded-lg border border-border bg-muted/30 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium">
                      {ENTITY_LABELS[mutation.entity]} · {mutation.operation}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ID {String(mutation.entityId)}
                    </p>
                    {mutation.lastError ? (
                      <p className="text-xs text-destructive">{mutation.lastError}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onRetry(mutation.id)}
                    >
                      Tentar novamente
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        const confirmed = window.confirm(
                          "Descartar esta operação? Ela será removida da fila e não será sincronizada.",
                        );
                        if (confirmed) {
                          onDiscard(mutation.id);
                        }
                      }}
                    >
                      Descartar
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {errors.length > 0 ? (
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <Button type="button" onClick={onRetryAll}>
              Tentar todos
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
