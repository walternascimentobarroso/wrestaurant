import type { PaymentMethod } from "@/features/tables/types";

export type SaleSource = "table" | "manual" | "adjusted";

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  tableNumber: number;
  openedAt?: string;
  paidAt: string;
  paymentMethod: PaymentMethod;
  amountReceived: number;
  change: number;
  total: number;
  items: SaleItem[];
  description: string;
  source?: SaleSource;
  adjustmentReason?: string;
}

export interface SaleItemInput {
  productId: string;
  quantity: number;
}

export interface SaleFormInput {
  tableNumber: number;
  paidAt: string;
  openedAt?: string;
  paymentMethod: PaymentMethod;
  amountReceived: number;
  change: number;
  items: SaleItemInput[];
  reason: string;
}

export type SaleActionResult =
  | { ok: true }
  | { ok: false; error: string };

export interface PaymentDetails {
  method: PaymentMethod;
  amountReceived: number;
  change: number;
}
