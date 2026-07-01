"use client";

import { useCallback, useSyncExternalStore } from "react";

import {
  isSupplierNameTaken,
  validateSupplierInput,
} from "../services/supplierService";
import {
  createSupplierApi,
  deleteSupplierApi,
  getSuppliersServerSnapshot,
  getSuppliersSnapshot,
  subscribeSuppliers,
  updateSupplierApi,
} from "../services/supplierStorage";
import type { SupplierActionResult, SupplierInput } from "../types";

export function useSuppliers() {
  const suppliers = useSyncExternalStore(
    subscribeSuppliers,
    getSuppliersSnapshot,
    getSuppliersServerSnapshot,
  );

  const createSupplier = useCallback(
    async (input: SupplierInput): Promise<SupplierActionResult> => {
      const validation = validateSupplierInput(input);
      if (!validation.ok) {
        return validation;
      }

      if (isSupplierNameTaken(suppliers, input.name)) {
        return { ok: false, error: "Já existe um fornecedor com este nome." };
      }

      try {
        await createSupplierApi({
          name: input.name.trim(),
          taxId: input.taxId?.trim() || undefined,
          tradeName: input.tradeName?.trim() || undefined,
          legalName: input.legalName?.trim() || undefined,
          contactName: input.contactName?.trim() || undefined,
          email: input.email?.trim() || undefined,
          phone: input.phone?.trim() || undefined,
          notes: input.notes?.trim() || undefined,
        });
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Não foi possível criar o fornecedor.",
        };
      }
    },
    [suppliers],
  );

  const updateSupplier = useCallback(
    async (id: string, input: SupplierInput): Promise<SupplierActionResult> => {
      const validation = validateSupplierInput(input);
      if (!validation.ok) {
        return validation;
      }

      if (isSupplierNameTaken(suppliers, input.name, id)) {
        return { ok: false, error: "Já existe um fornecedor com este nome." };
      }

      try {
        await updateSupplierApi(id, {
          name: input.name.trim(),
          taxId: input.taxId?.trim() || undefined,
          tradeName: input.tradeName?.trim() || undefined,
          legalName: input.legalName?.trim() || undefined,
          contactName: input.contactName?.trim() || undefined,
          email: input.email?.trim() || undefined,
          phone: input.phone?.trim() || undefined,
          notes: input.notes?.trim() || undefined,
        });
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Não foi possível atualizar o fornecedor.",
        };
      }
    },
    [suppliers],
  );

  const deleteSupplier = useCallback(async (id: string): Promise<SupplierActionResult> => {
    try {
      await deleteSupplierApi(id);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Não foi possível excluir o fornecedor.",
      };
    }
  }, []);

  return {
    suppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier,
  };
}
