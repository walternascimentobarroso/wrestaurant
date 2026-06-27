import type { PaymentMethod } from "@/features/tables/types";

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
  paidAt: string;
  paymentMethod: PaymentMethod;
  amountReceived: number;
  change: number;
  total: number;
  items: SaleItem[];
  description: string;
}

export interface PaymentDetails {
  method: PaymentMethod;
  amountReceived: number;
  change: number;
}
