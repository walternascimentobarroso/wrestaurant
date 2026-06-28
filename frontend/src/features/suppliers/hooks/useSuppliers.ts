"use client";

import { useCallback, useSyncExternalStore } from "react";

import {
  countPayablesBySupplier,
  isSupplierNameTaken,
  validateSupplierInput,
} from "../services/supplierService";
import {
  getSuppliersServerSnapshot,
  getSuppliersSnapshot,
  persistSuppliers,
  subscribeSuppliers,
} from "../services/supplierStorage";
import type { Supplier, SupplierActionResult, SupplierInput } from "../types";

function createSupplierId(): string {
  return `supplier-${crypto.randomUUID()}`;
}

export function useSuppliers() {
  const suppliers = useSyncExternalStore(
    subscribeSuppliers,
    getSuppliersSnapshot,
    getSuppliersServerSnapshot,
  );

  const saveSuppliers = useCallback((nextSuppliers: Supplier[]) => {
    persistSuppliers(nextSuppliers);
  }, []);

  const createSupplier = useCallback(
    (input: SupplierInput): SupplierActionResult => {
      const validation = validateSupplierInput(input);
      if (!validation.ok) {
        return validation;
      }

      if (isSupplierNameTaken(suppliers, input.name)) {
        return { ok: false, error: "Já existe um fornecedor com este nome." };
      }

      const supplier: Supplier = {
        id: createSupplierId(),
        name: input.name.trim(),
        contactName: input.contactName?.trim() || undefined,
        email: input.email?.trim() || undefined,
        phone: input.phone?.trim() || undefined,
        notes: input.notes?.trim() || undefined,
        createdAt: new Date().toISOString(),
      };

      saveSuppliers([supplier, ...suppliers]);
      return { ok: true };
    },
    [suppliers, saveSuppliers],
  );

  const updateSupplier = useCallback(
    (id: string, input: SupplierInput): SupplierActionResult => {
      const current = suppliers.find((supplier) => supplier.id === id);
      if (!current) {
        return { ok: false, error: "Fornecedor não encontrado." };
      }

      const validation = validateSupplierInput(input);
      if (!validation.ok) {
        return validation;
      }

      if (isSupplierNameTaken(suppliers, input.name, id)) {
        return { ok: false, error: "Já existe um fornecedor com este nome." };
      }

      saveSuppliers(
        suppliers.map((supplier) =>
          supplier.id === id
            ? {
                ...supplier,
                name: input.name.trim(),
                contactName: input.contactName?.trim() || undefined,
                email: input.email?.trim() || undefined,
                phone: input.phone?.trim() || undefined,
                notes: input.notes?.trim() || undefined,
              }
            : supplier,
        ),
      );

      return { ok: true };
    },
    [suppliers, saveSuppliers],
  );

  const deleteSupplier = useCallback(
    (id: string): SupplierActionResult => {
      const current = suppliers.find((supplier) => supplier.id === id);
      if (!current) {
        return { ok: false, error: "Fornecedor não encontrado." };
      }

      const linkedPayables = countPayablesBySupplier(id);
      if (linkedPayables > 0) {
        return {
          ok: false,
          error: `Não é possível excluir: ${linkedPayables} conta(s) vinculada(s) a este fornecedor.`,
        };
      }

      saveSuppliers(suppliers.filter((supplier) => supplier.id !== id));
      return { ok: true };
    },
    [suppliers, saveSuppliers],
  );

  return {
    suppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier,
  };
}
