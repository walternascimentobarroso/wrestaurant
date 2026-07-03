import type { Sale } from "../types";

export interface PaymentStats {
  total: number;
  count: number;
  cashTotal: number;
  cardTotal: number;
  cashCount: number;
  cardCount: number;
}

export function getPaymentStats(sales: Sale[]): PaymentStats {
  const cashSales = sales.filter((sale) => sale.paymentMethod === "cash");
  const cardSales = sales.filter((sale) => sale.paymentMethod === "card");

  return {
    total: sales.reduce((sum, sale) => sum + sale.total, 0),
    count: sales.length,
    cashTotal: cashSales.reduce((sum, sale) => sum + sale.total, 0),
    cardTotal: cardSales.reduce((sum, sale) => sum + sale.total, 0),
    cashCount: cashSales.length,
    cardCount: cardSales.length,
  };
}
