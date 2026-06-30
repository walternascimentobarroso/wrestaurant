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
import { Input } from "@/components/ui/input";

import {
  TABLE_SECTION_LABELS,
  type TableCategory,
  type TableWithDetails,
} from "@/features/tables/types";

const CATEGORY_OPTIONS: { value: TableCategory; label: string }[] = [
  { value: "counter", label: TABLE_SECTION_LABELS.counter },
  { value: "indoor", label: TABLE_SECTION_LABELS.indoor },
  { value: "outdoor", label: TABLE_SECTION_LABELS.outdoor },
];

interface TableFormState {
  number: string;
  category: TableCategory;
}

interface AdminTableDialogsProps {
  formOpen: boolean;
  onFormOpenChange: (open: boolean) => void;
  editingTable: TableWithDetails | null;
  form: TableFormState;
  onFormChange: (form: TableFormState) => void;
  formError: string;
  onFormSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  deleteTarget: TableWithDetails | null;
  onDeleteTargetChange: (table: TableWithDetails | null) => void;
  deleteError: string;
  onDeleteConfirm: () => void;
  getTableDisplayName: (table: TableWithDetails) => string;
}

export function AdminTableDialogs({
  formOpen,
  onFormOpenChange,
  editingTable,
  form,
  onFormChange,
  formError,
  onFormSubmit,
  deleteTarget,
  onDeleteTargetChange,
  deleteError,
  onDeleteConfirm,
  getTableDisplayName,
}: AdminTableDialogsProps) {
  return (
    <>
      <Dialog open={formOpen} onOpenChange={onFormOpenChange}>
        <DialogContent className="max-w-md rounded-3xl p-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {editingTable ? "Editar mesa" : "Nova mesa"}
            </DialogTitle>
            <DialogDescription>
              {editingTable
                ? "Altere o número ou a seção da mesa."
                : "Informe os dados da nova mesa."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onFormSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="table-category" className="text-sm font-medium">
                Seção
              </label>
              <select
                id="table-category"
                value={form.category}
                onChange={(event) =>
                  onFormChange({
                    ...form,
                    category: event.target.value as TableCategory,
                  })
                }
                className="h-11 w-full rounded-xl border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="table-number" className="text-sm font-medium">
                Número
              </label>
              <Input
                id="table-number"
                type="number"
                min={1}
                value={form.number}
                onChange={(event) =>
                  onFormChange({ ...form, number: event.target.value })
                }
                className="h-11 rounded-xl px-3"
              />
            </div>

            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

            <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => onFormOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="rounded-xl">
                {editingTable ? "Salvar" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            onDeleteTargetChange(null);
          }
        }}
      >
        <DialogContent className="max-w-md rounded-3xl p-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Excluir mesa</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `Deseja excluir ${getTableDisplayName(deleteTarget)}? Esta ação não pode ser desfeita.`
                : null}
            </DialogDescription>
          </DialogHeader>

          {deleteError ? <p className="text-sm text-destructive">{deleteError}</p> : null}

          <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => onDeleteTargetChange(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-xl"
              onClick={onDeleteConfirm}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
