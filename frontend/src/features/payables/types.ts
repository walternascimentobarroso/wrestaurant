export type PayableStoredStatus = "pending" | "paid" | "cancelled";

export type PayableStatus = PayableStoredStatus | "overdue";

export type PayableRecurrence = "none" | "monthly" | "quarterly" | "semiannual" | "yearly";

export type PayableManualStatus = "pending" | "paid";

export interface PayableCategory {
  id: string;
  name: string;
}

export interface Payable {
  id: string;
  categoryId: string;
  description: string;
  supplierId?: string;
  amount: number;
  dueDate: string;
  recurrence: PayableRecurrence;
  status: PayableStoredStatus;
  paidAt?: string;
  paidAmount?: number;
  notes?: string;
  createdAt: string;
}

export type PayableStatusFilter = "all" | "pending" | "overdue" | "paid";

export type PayableActionResult = { ok: true } | { ok: false; error: string };

export interface PayableFormInput {
  categoryId: string;
  description: string;
  supplierId?: string;
  amount: number;
  dueDate: string;
  recurrence: PayableRecurrence;
  status?: PayableManualStatus;
  paidAt?: string;
  paidAmount?: number;
  notes?: string;
}

export interface PayableSummary {
  dueSoonCount: number;
  dueSoonTotal: number;
  overdueCount: number;
  overdueTotal: number;
  paidThisMonthCount: number;
  paidThisMonthTotal: number;
  pendingThisMonthTotal: number;
}
