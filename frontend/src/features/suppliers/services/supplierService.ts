import { getPayablesSnapshot } from "@/features/payables/services/payableStorage";

import type { Supplier, SupplierActionResult, SupplierInput } from "../types";

export function validateSupplierInput(input: SupplierInput): SupplierActionResult {
  if (!input.name.trim()) {
    return { ok: false, error: "Informe o nome do fornecedor." };
  }

  const email = input.email?.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Informe um e-mail válido." };
  }

  return { ok: true };
}

export function isSupplierNameTaken(
  suppliers: Supplier[],
  name: string,
  excludeId?: string,
): boolean {
  const normalized = name.trim().toLowerCase();
  return suppliers.some(
    (supplier) =>
      supplier.id !== excludeId && supplier.name.trim().toLowerCase() === normalized,
  );
}

export function countPayablesBySupplier(supplierId: string): number {
  return getPayablesSnapshot().filter((payable) => payable.supplierId === supplierId).length;
}

export function getSupplierName(
  suppliers: Supplier[],
  supplierId: string | undefined,
): string | undefined {
  if (!supplierId) {
    return undefined;
  }

  return suppliers.find((supplier) => supplier.id === supplierId)?.name;
}
