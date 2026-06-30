import type { Payable } from "../types";
import type { PayableFormInput } from "../types";
import {
  applyPaidStatus,
  applyPendingStatus,
  buildNextRecurringPayable,
  buildPayableFromInput,
} from "./payableService";

export function applyCreatePayable(
  payables: Payable[],
  input: PayableFormInput,
  id: string,
  createdAt: string,
): Payable[] {
  const payable = buildPayableFromInput(input, id, createdAt);
  const next = buildNextRecurringPayable(payable, `${id}-next-${Date.now()}`);
  return next ? [next, payable, ...payables] : [payable, ...payables];
}

export function applyUpdatePayable(
  payables: Payable[],
  id: string,
  input: PayableFormInput,
): Payable[] {
  const current = payables.find((payable) => payable.id === id);
  if (!current) {
    return payables;
  }

  const updated = buildPayableFromInput(
    input,
    id,
    current.createdAt,
    current,
  );

  const wasPaid = current.status === "paid";
  const next =
    !wasPaid && updated.status === "paid" && updated.recurrence !== "none"
      ? buildNextRecurringPayable(updated, `${id}-next-${Date.now()}`)
      : null;

  const withoutCurrent = payables.filter((payable) => payable.id !== id);
  return next ? [next, updated, ...withoutCurrent] : [updated, ...withoutCurrent];
}

export function applyDeletePayable(payables: Payable[], id: string): Payable[] {
  return payables.filter((payable) => payable.id !== id);
}

export function applyMarkPayablePaid(
  payables: Payable[],
  id: string,
  paidAt: string,
  paidAmount: number,
): Payable[] {
  const current = payables.find((payable) => payable.id === id);
  if (!current) {
    return payables;
  }

  const updated = applyPaidStatus(current, paidAt, paidAmount);
  const next =
    updated.recurrence !== "none"
      ? buildNextRecurringPayable(updated, `${id}-next-${Date.now()}`)
      : null;

  const withoutCurrent = payables.filter((payable) => payable.id !== id);
  return next ? [next, updated, ...withoutCurrent] : [updated, ...withoutCurrent];
}

export function applyMarkPayablePending(payables: Payable[], id: string): Payable[] {
  return payables.map((payable) =>
    payable.id === id ? applyPendingStatus(payable) : payable,
  );
}

export function replacePayableId(
  payables: Payable[],
  oldId: string,
  newId: string,
): Payable[] {
  return payables.map((payable) =>
    payable.id === oldId ? { ...payable, id: newId } : payable,
  );
}
