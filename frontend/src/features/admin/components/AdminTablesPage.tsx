"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { useTableAdmin } from "@/features/tables/hooks/useTableAdmin";
import {
  TABLE_CATEGORY_LABELS,
  TABLE_SECTION_LABELS,
  type TableCategory,
  type TableWithDetails,
} from "@/features/tables/types";

const AdminTableDialogs = dynamic(
  () =>
    import("./AdminTableDialogs").then((module) => ({
      default: module.AdminTableDialogs,
    })),
  { ssr: false },
);

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
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<TableWithDetails | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const tablesByCategory = useMemo(
    () =>
      CATEGORY_OPTIONS.reduce<Record<TableCategory, TableWithDetails[]>>(
        (accumulator, option) => {
          const categoryTables = tables.filter((table) => table.category === option.value);
          accumulator[option.value] = categoryTables.filter((table) => {
            if (!normalizedSearchQuery) {
              return true;
            }

            const tableLabel = getTableDisplayName(table).toLowerCase();
            const tableNumber = String(table.number);
            return (
              tableLabel.includes(normalizedSearchQuery) ||
              tableNumber.includes(normalizedSearchQuery)
            );
          });
          return accumulator;
        },
        { counter: [], indoor: [], outdoor: [] },
      ),
    [tables, normalizedSearchQuery],
  );

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

  async function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
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
      const result = await updateTable(editingTable.id, {
        number,
        category: form.category,
      });

      if (!result.ok) {
        setFormError(result.error ?? "Não foi possível atualizar a mesa.");
        return;
      }
    } else {
      try {
        await createTable({ number, category: form.category });
      } catch {
        setFormError("Não foi possível cadastrar a mesa.");
        return;
      }
    }

    setFormOpen(false);
    setEditingTable(null);
    setForm(EMPTY_FORM);
    setFormError("");
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) {
      return;
    }

    const result = await deleteTable(deleteTarget.id);
    if (!result.ok) {
      setDeleteError(result.error ?? "Não foi possível excluir a mesa.");
      return;
    }

    setDeleteTarget(null);
    setDeleteError("");
  }

  function handleDeleteTargetChange(table: TableWithDetails | null) {
    setDeleteTarget(table);
    if (!table) {
      setDeleteError("");
    }
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
        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Buscar por nome ou número da mesa"
          className="h-10 max-w-md rounded-xl px-3"
        />

        {CATEGORY_OPTIONS.map(({ value: category, label }) => {
          const categoryTables = tablesByCategory[category];

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
                                  ? "bg-primary text-primary-foreground"
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

      {formOpen || deleteTarget ? (
        <AdminTableDialogs
          formOpen={formOpen}
          onFormOpenChange={setFormOpen}
          editingTable={editingTable}
          form={form}
          onFormChange={setForm}
          formError={formError}
          onFormSubmit={handleFormSubmit}
          deleteTarget={deleteTarget}
          onDeleteTargetChange={handleDeleteTargetChange}
          deleteError={deleteError}
          onDeleteConfirm={handleDeleteConfirm}
          getTableDisplayName={getTableDisplayName}
        />
      ) : null}
    </div>
  );
}
