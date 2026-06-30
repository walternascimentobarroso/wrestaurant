"use client";

import { useMemo, useState } from "react";
import { Building2, History, Pencil, Plus, Trash2 } from "lucide-react";

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
import { PurchaseHistoryDialog } from "@/features/purchases/components/PurchaseHistoryDialog";
import { usePurchases } from "@/features/purchases/hooks/usePurchases";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { countPayablesBySupplier } from "@/features/suppliers/services/supplierService";
import { useSuppliers } from "@/features/suppliers/hooks/useSuppliers";
import type { Supplier } from "@/features/suppliers/types";

const PAGE_SIZE = 10;

interface SupplierFormState {
  name: string;
  contactName: string;
  email: string;
  phone: string;
  notes: string;
}

const EMPTY_FORM: SupplierFormState = {
  name: "",
  contactName: "",
  email: "",
  phone: "",
  notes: "",
};

function supplierToForm(supplier: Supplier): SupplierFormState {
  return {
    name: supplier.name,
    contactName: supplier.contactName ?? "",
    email: supplier.email ?? "",
    phone: supplier.phone ?? "",
    notes: supplier.notes ?? "",
  };
}

export function AdminSuppliersPage() {
  const { formatCurrency } = useSettings();
  const { getPurchasesForSupplier, countBySupplier, totalPurchases } = usePurchases();
  const { suppliers, createSupplier, updateSupplier, deleteSupplier } = useSuppliers();

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [historySupplier, setHistorySupplier] = useState<Supplier | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [form, setForm] = useState<SupplierFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const filteredSuppliers = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return suppliers
      .filter((supplier) => {
        if (!normalizedQuery) {
          return true;
        }

        const haystack = [
          supplier.name,
          supplier.contactName ?? "",
          supplier.email ?? "",
          supplier.phone ?? "",
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(normalizedQuery);
      })
      .sort((a, b) => a.name.localeCompare(b.name, "pt-PT"));
  }, [suppliers, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredSuppliers.length / PAGE_SIZE));
  const effectivePage = Math.min(currentPage, totalPages);

  const paginatedSuppliers = useMemo(() => {
    const start = (effectivePage - 1) * PAGE_SIZE;
    return filteredSuppliers.slice(start, start + PAGE_SIZE);
  }, [filteredSuppliers, effectivePage]);

  const rangeStart =
    filteredSuppliers.length === 0 ? 0 : (effectivePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(effectivePage * PAGE_SIZE, filteredSuppliers.length);

  function openCreateForm() {
    setEditingSupplier(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setFormOpen(true);
  }

  function openEditForm(supplier: Supplier) {
    setEditingSupplier(supplier);
    setForm(supplierToForm(supplier));
    setFormError("");
    setFormOpen(true);
  }

  function openSupplierHistory(supplier: Supplier) {
    setHistorySupplier(supplier);
    window.setTimeout(() => setHistoryOpen(true), 0);
  }

  function closeSupplierHistory() {
    setHistoryOpen(false);
    setHistorySupplier(null);
  }

  async function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const input = {
      name: form.name,
      contactName: form.contactName || undefined,
      email: form.email || undefined,
      phone: form.phone || undefined,
      notes: form.notes || undefined,
    };

    const result = editingSupplier
      ? await updateSupplier(editingSupplier.id, input)
      : await createSupplier(input);

    if (!result.ok) {
      setFormError(result.error ?? "Não foi possível salvar o fornecedor.");
      return;
    }

    setFormOpen(false);
    setEditingSupplier(null);
    setFormError("");
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) {
      return;
    }

    const result = await deleteSupplier(deleteTarget.id);
    if (!result.ok) {
      setDeleteError(result.error ?? "Não foi possível excluir o fornecedor.");
      return;
    }

    setDeleteTarget(null);
    setDeleteError("");
  }

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b border-border bg-card px-6 py-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-heading text-xl font-bold text-foreground">Fornecedores</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Cadastre fornecedores e acompanhe o histórico de compras
            </p>
          </div>
          <Button type="button" className="rounded-xl" onClick={openCreateForm}>
            <Plus className="size-4" />
            Novo fornecedor
          </Button>
        </div>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-elevated">
            <p className="text-sm text-muted-foreground">Total cadastrado</p>
            <p className="mt-1 font-heading text-2xl font-bold text-foreground">
              {suppliers.length}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-elevated">
            <p className="text-sm text-muted-foreground">Com contas vinculadas</p>
            <p className="mt-1 font-heading text-2xl font-bold text-primary">
              {suppliers.filter((supplier) => countPayablesBySupplier(supplier.id) > 0).length}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-elevated">
            <p className="text-sm text-muted-foreground">Compras registradas</p>
            <p className="mt-1 font-heading text-2xl font-bold text-emerald-600">
              {totalPurchases}
            </p>
          </div>
        </div>

        <Input
          value={searchQuery}
          onChange={(event) => {
            setSearchQuery(event.target.value);
            setCurrentPage(1);
          }}
          placeholder="Buscar por nome, contacto, e-mail ou telefone"
          className="h-10 max-w-md rounded-xl px-3"
        />

        {filteredSuppliers.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border px-6 py-10">
            <Building2 className="size-10 text-muted-foreground/50" />
            <p className="text-center text-muted-foreground">
              {suppliers.length === 0
                ? "Nenhum fornecedor cadastrado ainda."
                : "Nenhum fornecedor encontrado para a busca."}
            </p>
            {suppliers.length === 0 ? (
              <Button type="button" variant="outline" className="rounded-xl" onClick={openCreateForm}>
                <Plus className="size-4" />
                Cadastrar primeiro fornecedor
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left">
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Contacto</th>
                  <th className="px-4 py-3 font-medium">E-mail</th>
                  <th className="px-4 py-3 font-medium">Telefone</th>
                  <th className="px-4 py-3 font-medium">Contas</th>
                  <th className="px-4 py-3 font-medium">Compras</th>
                  <th className="px-4 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSuppliers.map((supplier) => {
                  const linkedPayables = countPayablesBySupplier(supplier.id);
                  const purchaseCount = countBySupplier(supplier.id);

                  return (
                    <tr key={supplier.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Building2 className="size-4" />
                          </div>
                          <span className="font-medium text-foreground">{supplier.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {supplier.contactName ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{supplier.email ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{supplier.phone ?? "—"}</td>
                      <td className="px-4 py-3 font-semibold text-foreground">{linkedPayables}</td>
                      <td className="px-4 py-3 font-semibold text-foreground">{purchaseCount}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-lg"
                            aria-label={`Histórico de compras de ${supplier.name}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              openSupplierHistory(supplier);
                            }}
                            disabled={purchaseCount === 0}
                          >
                            <History className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-lg"
                            onClick={() => openEditForm(supplier)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-lg text-destructive hover:text-destructive"
                            onClick={() => {
                              setDeleteTarget(supplier);
                              setDeleteError("");
                            }}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredSuppliers.length > PAGE_SIZE ? (
              <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Mostrando {rangeStart}–{rangeEnd} de {filteredSuppliers.length} fornecedores
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    disabled={effectivePage <= 1}
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  >
                    Anterior
                  </Button>
                  <span className="min-w-24 text-center text-sm font-medium text-foreground">
                    Página {effectivePage} de {totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    disabled={effectivePage >= totalPages}
                    onClick={() =>
                      setCurrentPage((page) => Math.min(totalPages, page + 1))
                    }
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <PurchaseHistoryDialog
        open={historyOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeSupplierHistory();
          }
        }}
        title={historySupplier ? `Compras — ${historySupplier.name}` : "Histórico de compras"}
        description="Produtos comprados deste fornecedor."
        records={historySupplier ? getPurchasesForSupplier(historySupplier.id) : []}
        formatCurrency={formatCurrency}
      />

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          if (!open) {
            setFormOpen(false);
            setEditingSupplier(null);
            setFormError("");
          }
        }}
      >
        <DialogContent className="max-w-md rounded-3xl p-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {editingSupplier ? "Editar fornecedor" : "Novo fornecedor"}
            </DialogTitle>
            <DialogDescription>
              {editingSupplier
                ? "Atualize os dados do fornecedor."
                : "Cadastre um fornecedor para vincular às contas a pagar."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="supplier-name" className="text-sm font-medium">
                Nome
              </label>
              <Input
                id="supplier-name"
                value={form.name}
                onChange={(event) => {
                  setForm((current) => ({ ...current, name: event.target.value }));
                  setFormError("");
                }}
                className="h-11 rounded-xl px-3"
                placeholder="Ex.: EDP, Contabilista Silva"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="supplier-contact" className="text-sm font-medium">
                Nome do contacto (opcional)
              </label>
              <Input
                id="supplier-contact"
                value={form.contactName}
                onChange={(event) => {
                  setForm((current) => ({ ...current, contactName: event.target.value }));
                  setFormError("");
                }}
                className="h-11 rounded-xl px-3"
                placeholder="Ex.: João Silva"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="supplier-email" className="text-sm font-medium">
                  E-mail (opcional)
                </label>
                <Input
                  id="supplier-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, email: event.target.value }));
                    setFormError("");
                  }}
                  className="h-11 rounded-xl px-3"
                  placeholder="contato@empresa.pt"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="supplier-phone" className="text-sm font-medium">
                  Telefone (opcional)
                </label>
                <Input
                  id="supplier-phone"
                  value={form.phone}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, phone: event.target.value }));
                    setFormError("");
                  }}
                  className="h-11 rounded-xl px-3"
                  placeholder="+351 912 345 678"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="supplier-notes" className="text-sm font-medium">
                Observações (opcional)
              </label>
              <Input
                id="supplier-notes"
                value={form.notes}
                onChange={(event) => {
                  setForm((current) => ({ ...current, notes: event.target.value }));
                  setFormError("");
                }}
                className="h-11 rounded-xl px-3"
                placeholder="Ex.: Pagamento via multibanco"
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
                {editingSupplier ? "Salvar" : "Cadastrar"}
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
            <DialogTitle className="text-xl">Excluir fornecedor</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `Tem certeza que deseja excluir "${deleteTarget.name}"? Esta ação não pode ser desfeita.`
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
