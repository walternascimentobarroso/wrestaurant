import { getDateKeyFromDate, parseLocalDateKey } from "@/features/sales/utils/formatReportDate";

import type { Payable, PayableStatus, PayableStatusFilter } from "../types";

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getEffectiveStatus(payable: Payable, referenceDate = new Date()): PayableStatus {
  if (payable.status === "paid" || payable.status === "cancelled") {
    return payable.status;
  }

  const dueDate = parseLocalDateKey(payable.dueDate);
  if (!dueDate) {
    return "pending";
  }

  return dueDate < startOfDay(referenceDate) ? "overdue" : "pending";
}

export function matchesStatusFilter(
  payable: Payable,
  filter: PayableStatusFilter,
  referenceDate = new Date(),
): boolean {
  if (filter === "all") {
    return true;
  }

  return getEffectiveStatus(payable, referenceDate) === filter;
}

export function isDueWithinDays(
  payable: Payable,
  days: number,
  referenceDate = new Date(),
): boolean {
  const effectiveStatus = getEffectiveStatus(payable, referenceDate);
  if (effectiveStatus !== "pending") {
    return false;
  }

  const dueDate = parseLocalDateKey(payable.dueDate);
  if (!dueDate) {
    return false;
  }

  const today = startOfDay(referenceDate);
  const limit = new Date(today);
  limit.setDate(limit.getDate() + days);

  return dueDate >= today && dueDate <= limit;
}

export function getMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function matchesMonthFilter(
  payable: Payable,
  monthKey: string,
  referenceDate = new Date(),
): boolean {
  if (monthKey === "all") {
    return true;
  }

  const dueDate = parseLocalDateKey(payable.dueDate);
  if (!dueDate) {
    return false;
  }

  const effectiveStatus = getEffectiveStatus(payable, referenceDate);
  if (effectiveStatus === "paid" && payable.paidAt) {
    const paidDate = new Date(payable.paidAt);
    return getMonthKey(paidDate) === monthKey;
  }

  return getMonthKey(dueDate) === monthKey;
}

export function formatPayableDate(dateKey: string): string {
  const date = parseLocalDateKey(dateKey);
  if (!date) {
    return dateKey;
  }

  return date.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function getTodayDateKey(referenceDate = new Date()): string {
  return getDateKeyFromDate(referenceDate);
}
