import { getDateKeyFromDate, parseLocalDateKey } from "@/features/sales/utils/formatReportDate";

import type { PayableRecurrence } from "../types";

export const RECURRENCE_OPTIONS: { value: PayableRecurrence; label: string }[] = [
  { value: "none", label: "Pagamento único" },
  { value: "monthly", label: "Mensal" },
  { value: "quarterly", label: "Trimestral" },
  { value: "semiannual", label: "Semestral" },
  { value: "yearly", label: "Anual" },
];

export function getRecurrenceLabel(recurrence: PayableRecurrence): string {
  return RECURRENCE_OPTIONS.find((option) => option.value === recurrence)?.label ?? "Pagamento único";
}

export function calculateNextDueDate(
  dueDateKey: string,
  recurrence: PayableRecurrence,
): string | null {
  if (recurrence === "none") {
    return null;
  }

  const date = parseLocalDateKey(dueDateKey);
  if (!date) {
    return null;
  }

  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  switch (recurrence) {
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    case "quarterly":
      next.setMonth(next.getMonth() + 3);
      break;
    case "semiannual":
      next.setMonth(next.getMonth() + 6);
      break;
    case "yearly":
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      return null;
  }

  return getDateKeyFromDate(next);
}
