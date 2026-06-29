import { INITIAL_PAYABLE_CATEGORIES } from "../data/initialPayableCategories";
import {
  getEffectiveStatus,
  getMonthKey,
  isDueWithinDays,
  matchesMonthFilter,
  matchesStatusFilter,
} from "../utils/payableStatus";
import { calculateNextDueDate, getRecurrenceLabel } from "../utils/recurrence";
import type {
  Payable,
  PayableActionResult,
  PayableFormInput,
  PayableManualStatus,
  PayableRecurrence,
  PayableStatusFilter,
  PayableSummary,
} from "../types";

export function validatePayableInput(
  input: PayableFormInput,
  supplierExists: (supplierId: string) => boolean,
): PayableActionResult {
  if (!input.description.trim()) {
    return { ok: false, error: "Informe uma descrição." };
  }

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { ok: false, error: "Informe um valor válido maior que zero." };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) {
    return { ok: false, error: "Informe uma data de vencimento válida." };
  }

  const categoryExists = INITIAL_PAYABLE_CATEGORIES.some(
    (category) => category.id === input.categoryId,
  );
  if (!categoryExists) {
    return { ok: false, error: "Selecione uma categoria válida." };
  }

  if (input.supplierId && !supplierExists(input.supplierId)) {
    return { ok: false, error: "Selecione um fornecedor válido." };
  }

  if (input.status === "paid") {
    if (!input.paidAt) {
      return { ok: false, error: "Informe a data do pagamento." };
    }

    const paidAmount = input.paidAmount ?? input.amount;
    if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
      return { ok: false, error: "Informe um valor pago válido." };
    }
  }

  return { ok: true };
}

export function buildPayableFromInput(
  input: PayableFormInput,
  id: string,
  createdAt: string,
  current?: Payable,
): Payable {
  const status: PayableManualStatus =
    input.status ?? (current?.status === "paid" ? "paid" : "pending");
  const base = {
    id,
    categoryId: input.categoryId,
    description: input.description.trim(),
    supplierId: input.supplierId || undefined,
    amount: input.amount,
    dueDate: input.dueDate,
    recurrence: input.recurrence,
    notes: input.notes?.trim() || undefined,
    createdAt: current?.createdAt ?? createdAt,
  };

  if (status === "paid") {
    return {
      ...base,
      status: "paid",
      paidAt: input.paidAt ?? current?.paidAt ?? new Date().toISOString(),
      paidAmount: input.paidAmount ?? current?.paidAmount ?? input.amount,
    };
  }

  return {
    ...base,
    status: "pending",
    paidAt: undefined,
    paidAmount: undefined,
  };
}

export function buildNextRecurringPayable(paid: Payable, newId: string): Payable | null {
  const nextDueDate = calculateNextDueDate(paid.dueDate, paid.recurrence);
  if (!nextDueDate) {
    return null;
  }

  return {
    id: newId,
    categoryId: paid.categoryId,
    description: paid.description,
    supplierId: paid.supplierId,
    amount: paid.amount,
    dueDate: nextDueDate,
    recurrence: paid.recurrence,
    status: "pending",
    notes: paid.notes,
    createdAt: new Date().toISOString(),
  };
}

export function applyPaidStatus(
  payable: Payable,
  paidAt: string,
  paidAmount: number,
): Payable {
  return {
    ...payable,
    status: "paid",
    paidAt,
    paidAmount,
  };
}

export function applyPendingStatus(payable: Payable): Payable {
  return {
    ...payable,
    status: "pending",
    paidAt: undefined,
    paidAmount: undefined,
  };
}

export function filterPayables(
  payables: Payable[],
  statusFilter: PayableStatusFilter,
  monthFilter: string,
  searchQuery: string,
  resolveSupplierName: (supplierId: string | undefined) => string,
  referenceDate = new Date(),
): Payable[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  return payables.filter((payable) => {
    if (!matchesStatusFilter(payable, statusFilter, referenceDate)) {
      return false;
    }

    if (!matchesMonthFilter(payable, monthFilter, referenceDate)) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const categoryName = getCategoryName(payable.categoryId);
    const supplierName = resolveSupplierName(payable.supplierId);
    const recurrenceLabel = getRecurrenceLabel(payable.recurrence);

    const haystack = [payable.description, supplierName, categoryName, recurrenceLabel]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

export function computePayableSummary(
  payables: Payable[],
  referenceDate = new Date(),
): PayableSummary {
  const currentMonthKey = getMonthKey(referenceDate);

  let dueSoonCount = 0;
  let dueSoonTotal = 0;
  let overdueCount = 0;
  let overdueTotal = 0;
  let paidThisMonthCount = 0;
  let paidThisMonthTotal = 0;
  let pendingThisMonthTotal = 0;

  for (const payable of payables) {
    const effectiveStatus = getEffectiveStatus(payable, referenceDate);

    if (isDueWithinDays(payable, 7, referenceDate)) {
      dueSoonCount += 1;
      dueSoonTotal += payable.amount;
    }

    if (effectiveStatus === "overdue") {
      overdueCount += 1;
      overdueTotal += payable.amount;
    }

    if (payable.status === "paid" && payable.paidAt) {
      const paidMonthKey = getMonthKey(new Date(payable.paidAt));
      if (paidMonthKey === currentMonthKey) {
        paidThisMonthCount += 1;
        paidThisMonthTotal += payable.paidAmount ?? payable.amount;
      }
    }

    const dueDate = payable.dueDate.slice(0, 7);
    if (
      dueDate === currentMonthKey &&
      (effectiveStatus === "pending" || effectiveStatus === "overdue")
    ) {
      pendingThisMonthTotal += payable.amount;
    }
  }

  return {
    dueSoonCount,
    dueSoonTotal,
    overdueCount,
    overdueTotal,
    paidThisMonthCount,
    paidThisMonthTotal,
    pendingThisMonthTotal,
  };
}

export function getCategoryName(categoryId: string): string {
  return (
    INITIAL_PAYABLE_CATEGORIES.find((category) => category.id === categoryId)?.name ?? "Outros"
  );
}

export { INITIAL_PAYABLE_CATEGORIES, getRecurrenceLabel };
export type { PayableRecurrence };
