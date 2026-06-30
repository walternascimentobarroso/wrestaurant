import type { Supplier, SupplierInput } from "../types";

export function applyCreateSupplier(
  suppliers: Supplier[],
  input: SupplierInput,
  id: string,
  createdAt: string,
): Supplier[] {
  const supplier: Supplier = {
    id,
    name: input.name.trim(),
    contactName: input.contactName?.trim() || undefined,
    email: input.email?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    createdAt,
  };

  return [...suppliers, supplier].sort((a, b) => a.name.localeCompare(b.name));
}

export function applyUpdateSupplier(
  suppliers: Supplier[],
  id: string,
  input: SupplierInput,
): Supplier[] {
  return suppliers
    .map((supplier) =>
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
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function applyDeleteSupplier(suppliers: Supplier[], id: string): Supplier[] {
  return suppliers.filter((supplier) => supplier.id !== id);
}

export function replaceSupplierId(
  suppliers: Supplier[],
  oldId: string,
  newId: string,
): Supplier[] {
  return suppliers.map((supplier) =>
    supplier.id === oldId ? { ...supplier, id: newId } : supplier,
  );
}
