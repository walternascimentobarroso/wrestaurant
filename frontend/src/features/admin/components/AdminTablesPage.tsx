"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

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
import { cn } from "@/lib/utils";

import { useTableAdmin } from "@/features/tables/hooks/useTableAdmin";
import {
  TABLE_CATEGORY_LABELS,
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

const EMPTY_FORM: TableFormState = {
  number: "",
  category: "indoor",
};

function getTableDisplayName(table: TableWithDetails): string {
  const prefix = TABLE_CATEGORY_LABELS[table.category];
  return `${prefix} ${table.number}`;
}

export function AdminTablesPage() {
  const { tables, createTable, updateTable, deleteTable, getNextNumber } =
    useTableAdmin();

  const [formOpen, setFormOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<TableWithDetails | null>(null);
  const [form, setForm] = useState<TableFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<TableWithDetails | null>(null);
  const [deleteError, setDeleteError] = useState("");

  function openCreateForm(category: TableCategory) {
    setEditingTable(null);
    setForm({
      number: String(getNextNumber(category)),
      category,
    });
    setFormError("");
    setFormOpen(true);
  }

  function openEditForm(table: TableWithDetails) {
    setEditingTable(table);
    setForm({
      number: String(table.number),
      category: table.category,
    });
    setFormError("");
    setFormOpen(true);
  }

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const number = Number.parseInt(form.number, 10);
    if (!Number.isFinite(number) || number < 1) {
      setFormError("Informe um número válido (maior que zero).");
      return;
    }

    const duplicate = tables.some(
      (table) =>
        table.category === form.category &&
        table.number === number &&
        table.id !== editingTable?.id,
    );

    if (duplicate) {
      setFormError("Já existe uma mesa com este número nesta seção.");
      return;
    }

    if (editingTable) {
      const result = updateTable(editingTable.id, {
        number,
        category: form.category,
      });

      if (!result.ok) {
        setFormError(result.error ?? "Não foi possível atualizar a mesa.");
        return;
      }
    } else {
      createTable({ number, category: form.category });
    }

    setFormOpen(false);
    setEditingTable(null);
    setForm(EMPTY_FORM);
    setFormError("");
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) {
      return;
    }

    const result = deleteTable(deleteTarget.id);
    if (!result.ok) {
      setDeleteError(result.error ?? "Não foi possível excluir a mesa.");
      return;
    }

    setDeleteTarget(null);
    setDeleteError("");
  }

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b border-border bg-card px-6 py-4">
        <h2 className="font-heading text-xl font-bold text-foreground">Cadastro de mesas</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Adicione, edite ou remova mesas do salão.
        </p>
      </header>

      <div className="flex-1 space-y-8 overflow-y-auto px-6 py-6">
        {CATEGORY_OPTIONS.map(({ value: category, label }) => {
          const categoryTables = tables.filter((table) => table.category === category);

          return (
            <section key={category}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="font-heading text-lg font-semibold text-foreground">
                  {label}
                </h3>
                <Button
                  type="button"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => openCreateForm(category)}
                >
                  <Plus className="size-4" />
                  Adicionar
                </Button>
              </div>

              {categoryTables.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                  Nenhuma mesa cadastrada nesta seção.
                </p>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-left">
                        <th className="px-4 py-3 font-medium">Nome</th>
                        <th className="px-4 py-3 font-medium">Número</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 text-right font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryTables.map((table) => (
                        <tr key={table.id} className="border-b border-border last:border-0">
                          <td className="px-4 py-3 font-medium">
                            {getTableDisplayName(table)}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{table.number}</td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                                table.status === "occupied"
                                  ? "bg-primary/15 text-primary"
                                  : "bg-muted text-muted-foreground",
                              )}
                            >
                              {table.status === "occupied" ? "Ocupada" : "Livre"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                className="rounded-lg"
                                aria-label={`Editar ${getTableDisplayName(table)}`}
                                onClick={() => openEditForm(table)}
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                className="rounded-lg text-destructive hover:text-destructive"
                                aria-label={`Excluir ${getTableDisplayName(table)}`}
                                onClick={() => {
                                  setDeleteError("");
                                  setDeleteTarget(table);
                                }}
                                disabled={table.status === "occupied"}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          );
        })}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
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

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="table-category" className="text-sm font-medium">
                Seção
              </label>
              <select
                id="table-category"
                value={form.category}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    category: event.target.value as TableCategory,
                  }))
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
                  setForm((current) => ({ ...current, number: event.target.value }))
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
                onClick={() => setFormOpen(false)}
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
            setDeleteTarget(null);
            setDeleteError("");
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
              onClick={() => setDeleteTarget(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-xl"
              onClick={handleDeleteConfirm}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
