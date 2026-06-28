export interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  notes?: string;
  createdAt: string;
}

export interface SupplierInput {
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  notes?: string;
}

export type SupplierActionResult = { ok: true } | { ok: false; error: string };
