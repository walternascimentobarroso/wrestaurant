import type { Product, Table, TableOrderItem } from "@/features/tables/types";
import type { PaymentDetails, Sale, SaleItem } from "../types";

export function buildSaleIdFromMutationId(mutationId: string): string {
  return `sale-${mutationId}`;
}

export function buildSaleFromTable(
  table: Table,
  products: Product[],
  payment: PaymentDetails,
  saleId: string,
  paidAt = new Date().toISOString(),
): Sale {
  const items = buildSaleItems(table.items, products);
  const total = items.reduce((sum, item) => sum + item.subtotal, 0);
  const description = items
    .map((item) => `${item.quantity}x ${item.productName}`)
    .join(", ");

  return {
    id: saleId,
    tableNumber: table.number,
    openedAt: table.openedAt,
    paidAt,
    paymentMethod: payment.method,
    amountReceived: payment.amountReceived,
    change: payment.change,
    total,
    items,
    description,
  };
}

function buildSaleItems(
  orderItems: TableOrderItem[],
  products: Product[],
): SaleItem[] {
  const saleItems: SaleItem[] = [];

  for (const item of orderItems) {
    const product = products.find((entry) => entry.id === item.productId);
    if (!product) {
      continue;
    }

    const subtotal = product.price * item.quantity;
    saleItems.push({
      productId: product.id,
      productName: product.name,
      quantity: item.quantity,
      unitPrice: product.price,
      subtotal,
    });
  }

  return saleItems;
}

export function appendSale(sales: Sale[], sale: Sale): Sale[] {
  if (sales.some((entry) => entry.id === sale.id)) {
    return sales;
  }

  return [sale, ...sales].sort(
    (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
  );
}

export function replaceSaleId(sales: Sale[], oldId: string, newId: string): Sale[] {
  if (oldId === newId) {
    return sales;
  }

  if (sales.some((sale) => sale.id === newId)) {
    return sales.filter((sale) => sale.id !== oldId);
  }

  return sales.map((sale) => (sale.id === oldId ? { ...sale, id: newId } : sale));
}
