"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

import { getSupplierName } from "@/features/suppliers/services/supplierService";
import { getSuppliersSnapshot } from "@/features/suppliers/services/supplierStorage";

import {
  computePayableSummary,
  filterPayables,
  INITIAL_PAYABLE_CATEGORIES,
  validatePayableInput,
} from "../services/payableService";
import {
  createPayableApi,
  deletePayableApi,
  getPayablesServerSnapshot,
  getPayablesSnapshot,
  markPayablePaidApi,
  markPayablePendingApi,
  subscribePayables,
  updatePayableApi,
} from "../services/payableStorage";
import type {
  Payable,
  PayableActionResult,
  PayableFormInput,
  PayableManualStatus,
  PayableStatusFilter,
} from "../types";

export function usePayables() {
  const payables = useSyncExternalStore(
    subscribePayables,
    getPayablesSnapshot,
    getPayablesServerSnapshot,
  );

  const summary = useMemo(() => computePayableSummary(payables), [payables]);

  const supplierExists = useCallback((supplierId: string) => {
    return getSuppliersSnapshot().some((supplier) => supplier.id === supplierId);
  }, []);

  const resolveSupplierName = useCallback((supplierId: string | undefined): string => {
    return getSupplierName(getSuppliersSnapshot(), supplierId) ?? "";
  }, []);

  const createPayable = useCallback(
    async (input: PayableFormInput): Promise<PayableActionResult> => {
      const validation = validatePayableInput(input, supplierExists);
      if (!validation.ok) {
        return validation;
      }

      try {
        await createPayableApi({
          categoryId: input.categoryId,
          description: input.description,
          supplierId: input.supplierId,
          amount: input.amount,
          dueDate: input.dueDate,
          recurrence: input.recurrence,
          status: input.status,
          paidAt: input.paidAt,
          paidAmount: input.paidAmount,
          notes: input.notes,
        });
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Não foi possível criar a conta.",
        };
      }
    },
    [supplierExists],
  );

  const updatePayable = useCallback(
    async (id: string, input: PayableFormInput): Promise<PayableActionResult> => {
      const validation = validatePayableInput(input, supplierExists);
      if (!validation.ok) {
        return validation;
      }

      try {
        await updatePayableApi(id, {
          categoryId: input.categoryId,
          description: input.description,
          supplierId: input.supplierId,
          amount: input.amount,
          dueDate: input.dueDate,
          recurrence: input.recurrence,
          status: input.status,
          paidAt: input.paidAt,
          paidAmount: input.paidAmount,
          notes: input.notes,
        });
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Não foi possível atualizar a conta.",
        };
      }
    },
    [supplierExists],
  );

  const markAsPaid = useCallback(
    async (id: string, paidAt: string, paidAmount: number): Promise<PayableActionResult> => {
      try {
        await markPayablePaidApi(id, { paidAt, paidAmount });
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Não foi possível marcar como paga.",
        };
      }
    },
    [],
  );

  const changePayableStatus = useCallback(
    async (
      id: string,
      status: PayableManualStatus,
      paidAt?: string,
      paidAmount?: number,
    ): Promise<PayableActionResult> => {
      if (status === "pending") {
        try {
          await markPayablePendingApi(id);
          return { ok: true };
        } catch (error) {
          return {
            ok: false,
            error: error instanceof Error ? error.message : "Não foi possível atualizar o status.",
          };
        }
      }

      if (!paidAt) {
        return { ok: false, error: "Informe a data do pagamento." };
      }

      const current = payables.find((payable) => payable.id === id);
      const amount = paidAmount ?? current?.amount ?? 0;
      return markAsPaid(id, paidAt, amount);
    },
    [markAsPaid, payables],
  );

  const deletePayable = useCallback(async (id: string): Promise<PayableActionResult> => {
    try {
      await deletePayableApi(id);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Não foi possível excluir a conta.",
      };
    }
  }, []);

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
