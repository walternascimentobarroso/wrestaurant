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
  pending: SyncMutation[];
  errors: SyncMutation[];
  onRetry: (mutationId: string) => void;
  onRetryAll: () => void;
  onDiscard: (mutationId: string) => void;
}

function confirmDiscard(onConfirm: () => void): void {
  const confirmed = window.confirm(
    "Descartar esta operação? Ela será removida da fila e não será sincronizada.",
  );
  if (confirmed) {
    onConfirm();
  }
}

function MutationRow({
  mutation,
  statusLabel,
  statusClassName,
  onRetry,
  onDiscard,
}: {
  mutation: SyncMutation;
  statusLabel: string;
  statusClassName: string;
  onRetry?: (mutationId: string) => void;
  onDiscard: (mutationId: string) => void;
}) {
  return (
    <li className="rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium">
            {ENTITY_LABELS[mutation.entity]} · {mutation.operation}
          </p>
          <p className="text-xs text-muted-foreground">
            ID {String(mutation.entityId)}
          </p>
          <p className={`text-xs font-medium ${statusClassName}`}>{statusLabel}</p>
          {mutation.lastError ? (
            <p className="text-xs text-destructive">{mutation.lastError}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-2">
          {onRetry ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onRetry(mutation.id)}
            >
              Tentar novamente
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={() => confirmDiscard(() => onDiscard(mutation.id))}
          >
            Descartar
          </Button>
        </div>
      </div>
    </li>
  );
}

export function SyncErrorsDialog({
  open,
  onOpenChange,
  pending,
  errors,
  onRetry,
  onRetryAll,
  onDiscard,
}: SyncErrorsDialogProps) {
  const hasItems = pending.length > 0 || errors.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(85vh,640px)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Fila de sincronização</DialogTitle>
          <DialogDescription>
            Operações aguardando envio ou com falha. Descarte para remover da fila.
          </DialogDescription>
        </DialogHeader>

        {!hasItems ? (
          <p className="text-sm text-muted-foreground">Nenhuma operação na fila.</p>
        ) : (
          <div className="space-y-4">
            {pending.length > 0 ? (
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-amber-900">
                  Pendentes ({pending.length})
                </h3>
                <ul className="space-y-3">
                  {pending.map((mutation) => (
                    <MutationRow
                      key={mutation.id}
                      mutation={mutation}
                      statusLabel="Aguardando sincronização"
                      statusClassName="text-amber-800"
                      onDiscard={onDiscard}
                    />
                  ))}
                </ul>
              </section>
            ) : null}

            {errors.length > 0 ? (
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-destructive">
                  Com erro ({errors.length})
                </h3>
                <ul className="space-y-3">
                  {errors.map((mutation) => (
                    <MutationRow
                      key={mutation.id}
                      mutation={mutation}
                      statusLabel="Falhou após várias tentativas"
                      statusClassName="text-destructive"
                      onRetry={onRetry}
                      onDiscard={onDiscard}
                    />
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        )}

        {errors.length > 0 ? (
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <Button type="button" onClick={onRetryAll}>
              Tentar todos com erro
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
