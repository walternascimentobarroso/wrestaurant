"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

import { getSuppliersSnapshot } from "@/features/suppliers/services/supplierStorage";
import { getSupplierName } from "@/features/suppliers/services/supplierService";

import {
  applyPaidStatus,
  applyPendingStatus,
  buildNextRecurringPayable,
  buildPayableFromInput,
  computePayableSummary,
  filterPayables,
  INITIAL_PAYABLE_CATEGORIES,
  validatePayableInput,
} from "../services/payableService";
import {
  getPayablesServerSnapshot,
  getPayablesSnapshot,
  persistPayables,
  subscribePayables,
} from "../services/payableStorage";
import type {
  Payable,
  PayableActionResult,
  PayableFormInput,
  PayableManualStatus,
  PayableStatusFilter,
} from "../types";

function createPayableId(): string {
  return `payable-${crypto.randomUUID()}`;
}

function appendRecurringPayable(payables: Payable[], paid: Payable): Payable[] {
  const nextPayable = buildNextRecurringPayable(paid, createPayableId());
  if (!nextPayable) {
    return payables;
  }

  return [nextPayable, ...payables];
}

export function usePayables() {
  const payables = useSyncExternalStore(
    subscribePayables,
    getPayablesSnapshot,
    getPayablesServerSnapshot,
  );

  const summary = useMemo(() => computePayableSummary(payables), [payables]);

  const savePayables = useCallback((nextPayables: Payable[]) => {
    persistPayables(nextPayables);
  }, []);

  const supplierExists = useCallback((supplierId: string) => {
    return getSuppliersSnapshot().some((supplier) => supplier.id === supplierId);
  }, []);

  const resolveSupplierName = useCallback((supplierId: string | undefined): string => {
    return getSupplierName(getSuppliersSnapshot(), supplierId) ?? "";
  }, []);

  const createPayable = useCallback(
    (input: PayableFormInput): PayableActionResult => {
      const validation = validatePayableInput(input, supplierExists);
      if (!validation.ok) {
        return validation;
      }

      const payable = buildPayableFromInput(input, createPayableId(), new Date().toISOString());
      let nextPayables = [payable, ...payables];

      if (payable.status === "paid" && payable.recurrence !== "none") {
        nextPayables = appendRecurringPayable(nextPayables, payable);
      }

      savePayables(nextPayables);
      return { ok: true };
    },
    [payables, savePayables, supplierExists],
  );

  const updatePayable = useCallback(
    (id: string, input: PayableFormInput): PayableActionResult => {
      const current = payables.find((payable) => payable.id === id);
      if (!current) {
        return { ok: false, error: "Conta não encontrada." };
      }

      const validation = validatePayableInput(input, supplierExists);
      if (!validation.ok) {
        return validation;
      }

      const wasPaid = current.status === "paid";
      const updated = buildPayableFromInput(input, id, current.createdAt, current);

      let nextPayables = payables.map((payable) => (payable.id === id ? updated : payable));

      if (!wasPaid && updated.status === "paid" && updated.recurrence !== "none") {
        nextPayables = appendRecurringPayable(nextPayables, updated);
      }

      savePayables(nextPayables);
      return { ok: true };
    },
    [payables, savePayables, supplierExists],
  );

  const markAsPaid = useCallback(
    (id: string, paidAt: string, paidAmount: number): PayableActionResult => {
      const current = payables.find((payable) => payable.id === id);
      if (!current) {
        return { ok: false, error: "Conta não encontrada." };
      }

      if (current.status === "paid") {
        return { ok: false, error: "Esta conta já está paga." };
      }

      if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
        return { ok: false, error: "Informe um valor pago válido." };
      }

      const paid = applyPaidStatus(current, paidAt, paidAmount);
      let nextPayables = payables.map((payable) => (payable.id === id ? paid : payable));

      if (paid.recurrence !== "none") {
        nextPayables = appendRecurringPayable(nextPayables, paid);
      }

      savePayables(nextPayables);
      return { ok: true };
    },
    [payables, savePayables],
  );

  const changePayableStatus = useCallback(
    (
      id: string,
      status: PayableManualStatus,
      paidAt?: string,
      paidAmount?: number,
    ): PayableActionResult => {
      const current = payables.find((payable) => payable.id === id);
      if (!current) {
        return { ok: false, error: "Conta não encontrada." };
      }

      if (status === "pending") {
        savePayables(
          payables.map((payable) =>
            payable.id === id ? applyPendingStatus(payable) : payable,
          ),
        );
        return { ok: true };
      }

      if (!paidAt) {
        return { ok: false, error: "Informe a data do pagamento." };
      }

      const amount = paidAmount ?? current.amount;
      if (!Number.isFinite(amount) || amount <= 0) {
        return { ok: false, error: "Informe um valor pago válido." };
      }

      const wasPaid = current.status === "paid";
      const paid = applyPaidStatus(current, paidAt, amount);
      let nextPayables = payables.map((payable) => (payable.id === id ? paid : payable));

      if (!wasPaid && paid.recurrence !== "none") {
        nextPayables = appendRecurringPayable(nextPayables, paid);
      }

      savePayables(nextPayables);
      return { ok: true };
    },
    [payables, savePayables],
  );

  const deletePayable = useCallback(
    (id: string): PayableActionResult => {
      const exists = payables.some((payable) => payable.id === id);
      if (!exists) {
        return { ok: false, error: "Conta não encontrada." };
      }

      savePayables(payables.filter((payable) => payable.id !== id));
      return { ok: true };
    },
    [payables, savePayables],
  );

  const getFilteredPayables = useCallback(
    (statusFilter: PayableStatusFilter, monthFilter: string, searchQuery: string): Payable[] =>
      filterPayables(
        payables,
        statusFilter,
        monthFilter,
        searchQuery,
        resolveSupplierName,
      ),
    [payables, resolveSupplierName],
  );

  return {
    payables,
    categories: INITIAL_PAYABLE_CATEGORIES,
    summary,
    createPayable,
    updatePayable,
    markAsPaid,
    changePayableStatus,
    deletePayable,
    getFilteredPayables,
    resolveSupplierName,
  };
}
