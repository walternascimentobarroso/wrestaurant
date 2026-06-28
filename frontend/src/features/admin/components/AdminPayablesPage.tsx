"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, ArrowLeftRight, Pencil, Plus, Receipt, Trash2 } from "lucide-react";

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
import { PayableStatusBadge } from "@/features/payables/components/PayableStatusBadge";
import { usePayables } from "@/features/payables/hooks/usePayables";
import { getCategoryName, getRecurrenceLabel } from "@/features/payables/services/payableService";
import type {
  Payable,
  PayableManualStatus,
  PayableRecurrence,
  PayableStatusFilter,
} from "@/features/payables/types";
import {
  formatPayableDate,
  getEffectiveStatus,
  getMonthKey,
  getTodayDateKey,
} from "@/features/payables/utils/payableStatus";
import { RECURRENCE_OPTIONS } from "@/features/payables/utils/recurrence";
import { getLocalDateKey } from "@/features/sales/utils/formatReportDate";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { useSuppliers } from "@/features/suppliers/hooks/useSuppliers";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

const STATUS_FILTERS: { value: PayableStatusFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "pending", label: "Pendentes" },
  { value: "overdue", label: "Atrasadas" },
  { value: "paid", label: "Pagas" },
];

interface PayableFormState {
  categoryId: string;
  description: string;
  supplierId: string;
  amount: string;
  dueDate: string;
  recurrence: PayableRecurrence;
  status: PayableManualStatus;
  paidAt: string;
  paidAmount: string;
  notes: string;
}

const EMPTY_FORM: PayableFormState = {
  categoryId: "",
  description: "",
  supplierId: "",
  amount: "",
  dueDate: getTodayDateKey(),
  recurrence: "none",
  status: "pending",
  paidAt: getTodayDateKey(),
  paidAmount: "",
  notes: "",
};

function buildMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [{ value: "all", label: "Todos os meses" }];
  const now = new Date();

  for (let offset = -2; offset <= 6; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const value = getMonthKey(date);
    const label = date.toLocaleDateString("pt-PT", { month: "long", year: "numeric" });
    options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }

  return options;
}

function payableToForm(payable: Payable): PayableFormState {
  return {
    categoryId: payable.categoryId,
    description: payable.description,
    supplierId: payable.supplierId ?? "",
    amount: String(payable.amount),
    dueDate: payable.dueDate,
    recurrence: payable.recurrence,
    status: payable.status === "paid" ? "paid" : "pending",
    paidAt: payable.paidAt ? getLocalDateKey(payable.paidAt) : getTodayDateKey(),
    paidAmount: String(payable.paidAmount ?? payable.amount),
    notes: payable.notes ?? "",
  };
}

export function AdminPayablesPage() {
  const { formatCurrency } = useSettings();
  const {
    categories,
    summary,
    createPayable,
    updatePayable,
    markAsPaid,
    changePayableStatus,
    deletePayable,
    getFilteredPayables,
    resolveSupplierName,
  } = usePayables();
  const { suppliers } = useSuppliers();

  const monthOptions = useMemo(() => buildMonthOptions(), []);
  const currentMonthKey = getMonthKey(new Date());

  const [statusFilter, setStatusFilter] = useState<PayableStatusFilter>("all");
  const [monthFilter, setMonthFilter] = useState(currentMonthKey);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingPayable, setEditingPayable] = useState<Payable | null>(null);
  const [form, setForm] = useState<PayableFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  const [payTarget, setPayTarget] = useState<Payable | null>(null);
  const [paidAt, setPaidAt] = useState(getTodayDateKey());
  const [paidAmount, setPaidAmount] = useState("");
  const [payError, setPayError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<Payable | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const [statusTarget, setStatusTarget] = useState<Payable | null>(null);
  const [statusValue, setStatusValue] = useState<PayableManualStatus>("pending");
  const [statusPaidAt, setStatusPaidAt] = useState(getTodayDateKey());
  const [statusPaidAmount, setStatusPaidAmount] = useState("");
  const [statusError, setStatusError] = useState("");

  const filteredPayables = useMemo(
    () =>
      getFilteredPayables(statusFilter, monthFilter, searchQuery).sort((a, b) => {
        if (a.dueDate !== b.dueDate) {
          return a.dueDate.localeCompare(b.dueDate);
        }
        return a.description.localeCompare(b.description, "pt-PT");
      }),
    [getFilteredPayables, statusFilter, monthFilter, searchQuery],
  );

  const totalPages = Math.max(1, Math.ceil(filteredPayables.length / PAGE_SIZE));
  const effectivePage = Math.min(currentPage, totalPages);

  const paginatedPayables = useMemo(() => {
    const start = (effectivePage - 1) * PAGE_SIZE;
    return filteredPayables.slice(start, start + PAGE_SIZE);
  }, [filteredPayables, effectivePage]);

  const rangeStart =
    filteredPayables.length === 0 ? 0 : (effectivePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(effectivePage * PAGE_SIZE, filteredPayables.length);

  function resetFiltersPage() {
    setCurrentPage(1);
  }

  function openCreateForm() {
    setEditingPayable(null);
    setForm({
      ...EMPTY_FORM,
      categoryId: categories[0]?.id ?? "",
      dueDate: getTodayDateKey(),
    });
    setFormError("");
    setFormOpen(true);
  }

  function openEditForm(payable: Payable) {
    setEditingPayable(payable);
    setForm(payableToForm(payable));
    setFormError("");
    setFormOpen(true);
  }

  function openPayDialog(payable: Payable) {
    setPayTarget(payable);
    setPaidAt(getTodayDateKey());
    setPaidAmount(String(payable.amount));
    setPayError("");
  }

  function openStatusDialog(payable: Payable) {
    setStatusTarget(payable);
    setStatusValue(payable.status === "paid" ? "paid" : "pending");
    setStatusPaidAt(payable.paidAt ? getLocalDateKey(payable.paidAt) : getTodayDateKey());
    setStatusPaidAmount(String(payable.paidAmount ?? payable.amount));
    setStatusError("");
  }

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amount = Number.parseFloat(form.amount.replace(",", "."));
    const baseInput = {
      categoryId: form.categoryId,
      description: form.description,
      supplierId: form.supplierId || undefined,
      amount,
      dueDate: form.dueDate,
      recurrence: form.recurrence,
      notes: form.notes || undefined,
    };

    const input = editingPayable
      ? {
          ...baseInput,
          status: form.status,
          paidAt:
            form.status === "paid"
              ? new Date(`${form.paidAt}T12:00:00`).toISOString()
              : undefined,
          paidAmount:
            form.status === "paid"
              ? Number.parseFloat(form.paidAmount.replace(",", "."))
              : undefined,
        }
      : baseInput;

    const result = editingPayable
      ? updatePayable(editingPayable.id, input)
      : createPayable(input);

    if (!result.ok) {
      setFormError(result.error ?? "Não foi possível salvar a conta.");
      return;
    }

    setFormOpen(false);
    setEditingPayable(null);
    setFormError("");
  }

  function handlePaySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!payTarget) {
      return;
    }

    const amount = Number.parseFloat(paidAmount.replace(",", "."));
    const paidAtIso = new Date(`${paidAt}T12:00:00`).toISOString();
    const result = markAsPaid(payTarget.id, paidAtIso, amount);

    if (!result.ok) {
      setPayError(result.error ?? "Não foi possível registrar o pagamento.");
      return;
    }

    setPayTarget(null);
    setPayError("");
  }

  function handleStatusSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!statusTarget) {
      return;
    }

    const paidAtIso =
      statusValue === "paid" ? new Date(`${statusPaidAt}T12:00:00`).toISOString() : undefined;
    const paidAmount =
      statusValue === "paid"
        ? Number.parseFloat(statusPaidAmount.replace(",", "."))
        : undefined;

    const result = changePayableStatus(statusTarget.id, statusValue, paidAtIso, paidAmount);

    if (!result.ok) {
      setStatusError(result.error ?? "Não foi possível alterar o status.");
      return;
    }

    setStatusTarget(null);
    setStatusError("");
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) {
      return;
    }

    const result = deletePayable(deleteTarget.id);
    if (!result.ok) {
      setDeleteError(result.error ?? "Não foi possível excluir a conta.");
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
            <h2 className="font-heading text-xl font-bold text-foreground">Contas a pagar</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Gerencie despesas fixas e recorrentes do restaurante
            </p>
          </div>
          <Button type="button" className="rounded-xl" onClick={openCreateForm}>
            <Plus className="size-4" />
            Nova conta
          </Button>
        </div>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-elevated">
            <p className="text-sm text-muted-foreground">Vencendo em 7 dias</p>
            <p className="mt-1 font-heading text-2xl font-bold text-foreground">
              {formatCurrency(summary.dueSoonTotal)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {summary.dueSoonCount}{" "}
              {summary.dueSoonCount === 1 ? "conta" : "contas"}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-elevated">
            <p className="text-sm text-muted-foreground">Atrasadas</p>
            <p
              className={cn(
                "mt-1 font-heading text-2xl font-bold",
                summary.overdueCount > 0 ? "text-destructive" : "text-foreground",
              )}
            >
              {formatCurrency(summary.overdueTotal)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {summary.overdueCount}{" "}
              {summary.overdueCount === 1 ? "conta" : "contas"}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-elevated">
            <p className="text-sm text-muted-foreground">Pagas este mês</p>
            <p className="mt-1 font-heading text-2xl font-bold text-primary">
              {formatCurrency(summary.paidThisMonthTotal)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {summary.paidThisMonthCount}{" "}
              {summary.paidThisMonthCount === 1 ? "conta" : "contas"}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-elevated">
            <p className="text-sm text-muted-foreground">A pagar este mês</p>
            <p className="mt-1 font-heading text-2xl font-bold text-amber-600 dark:text-amber-400">
              {formatCurrency(summary.pendingThisMonthTotal)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Pendentes e atrasadas</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={statusFilter === option.value ? "default" : "outline"}
                className="rounded-xl"
                onClick={() => {
                  setStatusFilter(option.value);
                  resetFiltersPage();
                }}
              >
                {option.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={monthFilter}
              onChange={(event) => {
                setMonthFilter(event.target.value);
                resetFiltersPage();
              }}
              className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground"
            >
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Input
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                resetFiltersPage();
              }}
              placeholder="Buscar por descrição ou fornecedor"
              className="h-10 w-full min-w-56 rounded-xl px-3 lg:w-72"
            />
          </div>
        </div>

        {filteredPayables.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border px-6 py-10">
            <Receipt className="size-10 text-muted-foreground/50" />
            <p className="text-center text-muted-foreground">
              Nenhuma conta encontrada para os filtros selecionados.
            </p>
            <Button type="button" variant="outline" className="rounded-xl" onClick={openCreateForm}>
              <Plus className="size-4" />
              Cadastrar primeira conta
            </Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left">
                  <th className="px-4 py-3 font-medium">Descrição</th>
                  <th className="px-4 py-3 font-medium">Categoria</th>
                  <th className="px-4 py-3 font-medium">Periodicidade</th>
                  <th className="px-4 py-3 font-medium">Vencimento</th>
                  <th className="px-4 py-3 font-medium">Valor</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPayables.map((payable) => {
                  const effectiveStatus = getEffectiveStatus(payable);

                  return (
                    <tr key={payable.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-foreground">{payable.description}</p>
                          {payable.supplierId ? (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {resolveSupplierName(payable.supplierId)}
                            </p>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {getCategoryName(payable.categoryId)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {getRecurrenceLabel(payable.recurrence)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatPayableDate(payable.dueDate)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {formatCurrency(payable.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 rounded-full transition-opacity hover:opacity-80"
                          onClick={() => openStatusDialog(payable)}
                          title="Alterar status"
                        >
                          <PayableStatusBadge status={effectiveStatus} />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {effectiveStatus !== "paid" ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-lg"
                              onClick={() => openPayDialog(payable)}
                            >
                              <Check className="size-3.5" />
                              Pagar
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-lg"
                            onClick={() => openStatusDialog(payable)}
                          >
                            <ArrowLeftRight className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-lg"
                            onClick={() => openEditForm(payable)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-lg text-destructive hover:text-destructive"
                            onClick={() => {
                              setDeleteTarget(payable);
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

            {filteredPayables.length > PAGE_SIZE ? (
              <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Mostrando {rangeStart}–{rangeEnd} de {filteredPayables.length} contas
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

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          if (!open) {
            setFormOpen(false);
            setEditingPayable(null);
            setFormError("");
          }
        }}
      >
        <DialogContent className="max-w-md rounded-3xl p-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {editingPayable ? "Editar conta" : "Nova conta"}
            </DialogTitle>
            <DialogDescription>
              {editingPayable
                ? "Atualize os dados da conta a pagar."
                : "Cadastre uma nova despesa do restaurante."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="payable-category" className="text-sm font-medium">
                Categoria
              </label>
              <select
                id="payable-category"
                value={form.categoryId}
                onChange={(event) => {
                  setForm((current) => ({ ...current, categoryId: event.target.value }));
                  setFormError("");
                }}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="payable-description" className="text-sm font-medium">
                Descrição
              </label>
              <Input
                id="payable-description"
                value={form.description}
                onChange={(event) => {
                  setForm((current) => ({ ...current, description: event.target.value }));
                  setFormError("");
                }}
                className="h-11 rounded-xl px-3"
                placeholder="Ex.: Conta de luz"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="payable-supplier" className="text-sm font-medium">
                  Fornecedor (opcional)
                </label>
                <Link
                  href="/admin/fornecedores"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Gerenciar fornecedores
                </Link>
              </div>
              <select
                id="payable-supplier"
                value={form.supplierId}
                onChange={(event) => {
                  setForm((current) => ({ ...current, supplierId: event.target.value }));
                  setFormError("");
                }}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
              >
                <option value="">Nenhum fornecedor</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
              {suppliers.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Cadastre fornecedores em{" "}
                  <Link href="/admin/fornecedores" className="font-medium text-primary hover:underline">
                    Fornecedores
                  </Link>{" "}
                  para vincular às contas.
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="payable-recurrence" className="text-sm font-medium">
                Periodicidade
              </label>
              <select
                id="payable-recurrence"
                value={form.recurrence}
                onChange={(event) => {
                  setForm((current) => ({
                    ...current,
                    recurrence: event.target.value as PayableRecurrence,
                  }));
                  setFormError("");
                }}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
              >
                {RECURRENCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {editingPayable ? (
              <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
                <div className="space-y-2">
                  <label htmlFor="payable-status" className="text-sm font-medium">
                    Status
                  </label>
                  <select
                    id="payable-status"
                    value={form.status}
                    onChange={(event) => {
                      setForm((current) => ({
                        ...current,
                        status: event.target.value as PayableManualStatus,
                      }));
                      setFormError("");
                    }}
                    className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                  >
                    <option value="pending">Pendente</option>
                    <option value="paid">Pago</option>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Atrasado é aplicado automaticamente quando o vencimento passa sem pagamento.
                  </p>
                </div>

                {form.status === "paid" ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="form-paid-at" className="text-sm font-medium">
                        Data do pagamento
                      </label>
                      <Input
                        id="form-paid-at"
                        type="date"
                        value={form.paidAt}
                        onChange={(event) => {
                          setForm((current) => ({ ...current, paidAt: event.target.value }));
                          setFormError("");
                        }}
                        className="h-11 rounded-xl px-3"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="form-paid-amount" className="text-sm font-medium">
                        Valor pago
                      </label>
                      <Input
                        id="form-paid-amount"
                        type="number"
                        min={0.01}
                        step={0.01}
                        value={form.paidAmount}
                        onChange={(event) => {
                          setForm((current) => ({ ...current, paidAmount: event.target.value }));
                          setFormError("");
                        }}
                        className="h-11 rounded-xl px-3"
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="payable-amount" className="text-sm font-medium">
                  Valor
                </label>
                <Input
                  id="payable-amount"
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={form.amount}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, amount: event.target.value }));
                    setFormError("");
                  }}
                  className="h-11 rounded-xl px-3"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="payable-due-date" className="text-sm font-medium">
                  Vencimento
                </label>
                <Input
                  id="payable-due-date"
                  type="date"
                  value={form.dueDate}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, dueDate: event.target.value }));
                    setFormError("");
                  }}
                  className="h-11 rounded-xl px-3"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="payable-notes" className="text-sm font-medium">
                Observações (opcional)
              </label>
              <Input
                id="payable-notes"
                value={form.notes}
                onChange={(event) => {
                  setForm((current) => ({ ...current, notes: event.target.value }));
                  setFormError("");
                }}
                className="h-11 rounded-xl px-3"
                placeholder="Ex.: Referência multibanco"
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
                {editingPayable ? "Salvar" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={payTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPayTarget(null);
            setPayError("");
          }
        }}
      >
        <DialogContent className="max-w-md rounded-3xl p-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Registrar pagamento</DialogTitle>
            <DialogDescription>
              {payTarget
                ? `${payTarget.description} — ${formatCurrency(payTarget.amount)}`
                : null}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePaySubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="paid-at" className="text-sm font-medium">
                Data do pagamento
              </label>
              <Input
                id="paid-at"
                type="date"
                value={paidAt}
                onChange={(event) => {
                  setPaidAt(event.target.value);
                  setPayError("");
                }}
                className="h-11 rounded-xl px-3"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="paid-amount" className="text-sm font-medium">
                Valor pago
              </label>
              <Input
                id="paid-amount"
                type="number"
                min={0.01}
                step={0.01}
                value={paidAmount}
                onChange={(event) => {
                  setPaidAmount(event.target.value);
                  setPayError("");
                }}
                className="h-11 rounded-xl px-3"
              />
            </div>

            {payError ? <p className="text-sm text-destructive">{payError}</p> : null}

            {payTarget && payTarget.recurrence !== "none" ? (
              <p className="rounded-xl bg-primary/10 px-3 py-2 text-xs text-primary">
                A próxima parcela ({getRecurrenceLabel(payTarget.recurrence)}) será criada
                automaticamente após confirmar.
              </p>
            ) : null}

            <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => setPayTarget(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="rounded-xl">
                Confirmar pagamento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={statusTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setStatusTarget(null);
            setStatusError("");
          }
        }}
      >
        <DialogContent className="max-w-md rounded-3xl p-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Alterar status</DialogTitle>
            <DialogDescription>
              {statusTarget ? (
                <span className="flex flex-col gap-2">
                  <span>{statusTarget.description}</span>
                  <span className="inline-flex items-center gap-2">
                    Status atual:{" "}
                    <PayableStatusBadge status={getEffectiveStatus(statusTarget)} />
                  </span>
                </span>
              ) : null}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleStatusSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="status-value" className="text-sm font-medium">
                Novo status
              </label>
              <select
                id="status-value"
                value={statusValue}
                onChange={(event) => {
                  setStatusValue(event.target.value as PayableManualStatus);
                  setStatusError("");
                }}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
              >
                <option value="pending">Pendente</option>
                <option value="paid">Pago</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Atrasado é calculado automaticamente quando a data de vencimento passa e a conta
                continua pendente.
              </p>
            </div>

            {statusValue === "paid" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="status-paid-at" className="text-sm font-medium">
                    Data do pagamento
                  </label>
                  <Input
                    id="status-paid-at"
                    type="date"
                    value={statusPaidAt}
                    onChange={(event) => {
                      setStatusPaidAt(event.target.value);
                      setStatusError("");
                    }}
                    className="h-11 rounded-xl px-3"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="status-paid-amount" className="text-sm font-medium">
                    Valor pago
                  </label>
                  <Input
                    id="status-paid-amount"
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={statusPaidAmount}
                    onChange={(event) => {
                      setStatusPaidAmount(event.target.value);
                      setStatusError("");
                    }}
                    className="h-11 rounded-xl px-3"
                  />
                </div>
              </div>
            ) : null}

            {statusTarget && statusTarget.recurrence !== "none" && statusValue === "paid" ? (
              <p className="rounded-xl bg-primary/10 px-3 py-2 text-xs text-primary">
                Ao marcar como pago, a próxima parcela ({getRecurrenceLabel(statusTarget.recurrence)})
                será criada automaticamente.
              </p>
            ) : null}

            {statusError ? <p className="text-sm text-destructive">{statusError}</p> : null}

            <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => setStatusTarget(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="rounded-xl">
                Salvar status
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
            <DialogTitle className="text-xl">Excluir conta</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `Tem certeza que deseja excluir "${deleteTarget.description}"? Esta ação não pode ser desfeita.`
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
