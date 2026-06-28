import { getDateKeyFromDate } from "@/features/sales/utils/formatReportDate";

import type { Payable } from "../types";

function daysFromToday(days: number, reference = new Date()): string {
  const date = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  date.setDate(date.getDate() + days);
  return getDateKeyFromDate(date);
}

function monthsFromToday(months: number, reference = new Date()): string {
  const date = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  date.setMonth(date.getMonth() + months);
  return getDateKeyFromDate(date);
}

export function buildSeedPayables(reference = new Date()): Payable[] {
  return [
    {
      id: "payable-seed-luz",
      categoryId: "utilities",
      description: "Conta de luz",
      supplierId: "supplier-edp",
      amount: 284.5,
      dueDate: daysFromToday(5, reference),
      recurrence: "monthly",
      status: "pending",
      notes: "Referência multibanco enviada por e-mail",
      createdAt: "2026-06-01T10:00:00.000Z",
    },
    {
      id: "payable-seed-agua",
      categoryId: "utilities",
      description: "Conta de água",
      supplierId: "supplier-agua",
      amount: 96.3,
      dueDate: daysFromToday(-4, reference),
      recurrence: "monthly",
      status: "pending",
      createdAt: "2026-06-01T10:00:00.000Z",
    },
    {
      id: "payable-seed-contabilista",
      categoryId: "professional-services",
      description: "Honorários contabilista",
      supplierId: "supplier-contabilista",
      amount: 350,
      dueDate: daysFromToday(-10, reference),
      recurrence: "monthly",
      status: "paid",
      paidAt: daysFromToday(-8, reference) + "T14:30:00.000Z",
      paidAmount: 350,
      createdAt: "2026-06-01T10:00:00.000Z",
    },
    {
      id: "payable-seed-aluguel",
      categoryId: "rent",
      description: "Aluguel do restaurante",
      supplierId: "supplier-imobiliaria",
      amount: 2200,
      dueDate: daysFromToday(12, reference),
      recurrence: "monthly",
      status: "pending",
      createdAt: "2026-06-01T10:00:00.000Z",
    },
    {
      id: "payable-seed-internet",
      categoryId: "telecom",
      description: "Internet empresarial",
      supplierId: "supplier-nos",
      amount: 49.99,
      dueDate: daysFromToday(2, reference),
      recurrence: "monthly",
      status: "pending",
      createdAt: "2026-06-01T10:00:00.000Z",
    },
    {
      id: "payable-seed-gas",
      categoryId: "utilities",
      description: "Gás canalizado",
      supplierId: "supplier-galp",
      amount: 178.4,
      dueDate: daysFromToday(-15, reference),
      recurrence: "quarterly",
      status: "pending",
      createdAt: "2026-05-01T10:00:00.000Z",
    },
    {
      id: "payable-seed-seguro",
      categoryId: "other",
      description: "Seguro multirriscos",
      supplierId: "supplier-imobiliaria",
      amount: 890,
      dueDate: monthsFromToday(2, reference),
      recurrence: "yearly",
      status: "pending",
      createdAt: "2026-01-01T10:00:00.000Z",
    },
    {
      id: "payable-seed-taxa",
      categoryId: "taxes",
      description: "Taxa de ocupação de via pública",
      amount: 420,
      dueDate: daysFromToday(-20, reference),
      recurrence: "yearly",
      status: "paid",
      paidAt: daysFromToday(-18, reference) + "T09:15:00.000Z",
      paidAmount: 420,
      createdAt: "2026-05-01T10:00:00.000Z",
    },
    {
      id: "payable-seed-fornecedor",
      categoryId: "suppliers",
      description: "Compra de embalagens",
      amount: 312.75,
      dueDate: daysFromToday(7, reference),
      recurrence: "none",
      status: "pending",
      notes: "Pagamento único — pedido #4521",
      createdAt: "2026-06-20T10:00:00.000Z",
    },
  ];
}

export const SEED_PAYABLES = buildSeedPayables();
