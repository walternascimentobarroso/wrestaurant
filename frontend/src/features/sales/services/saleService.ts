import type { Product } from "@/features/tables/types";

import type { Sale, SaleActionResult, SaleFormInput, SaleItem, SaleItemInput } from "../types";

function buildSaleItems(
  itemsInput: SaleItemInput[],
  products: Product[],
): SaleItem[] {
  const saleItems: SaleItem[] = [];

  for (const entry of itemsInput) {
    const product = products.find((candidate) => candidate.id === entry.productId);
    if (!product) {
      continue;
    }

    const subtotal = product.price * entry.quantity;
    saleItems.push({
      productId: product.id,
      productName: product.name,
      quantity: entry.quantity,
      unitPrice: product.price,
      subtotal,
    });
  }

  return saleItems;
}

export function validateSaleInput(
  input: SaleFormInput,
  products: Product[],
): SaleActionResult {
  const reason = input.reason.trim();
  if (reason.length < 3) {
    return { ok: false, error: "Informe o motivo da correção (mínimo 3 caracteres)." };
  }

  if (!Number.isFinite(input.tableNumber) || input.tableNumber <= 0) {
    return { ok: false, error: "Informe um número de mesa válido." };
  }

  if (!input.paidAt) {
    return { ok: false, error: "Informe a data e hora do pagamento." };
  }

  if (input.items.length === 0) {
    return { ok: false, error: "Informe pelo menos um item na venda." };
  }

  for (const item of input.items) {
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      return { ok: false, error: "Informe quantidades válidas nos itens." };
    }

    const product = products.find((candidate) => candidate.id === item.productId);
    if (!product) {
      return { ok: false, error: "Selecione produtos válidos." };
    }

    if (product.kind === "ingredient") {
      return { ok: false, error: "Insumos não podem ser vendidos diretamente." };
    }
  }

  if (!Number.isFinite(input.amountReceived) || input.amountReceived < 0) {
    return { ok: false, error: "Informe o valor recebido." };
  }

  if (!Number.isFinite(input.change) || input.change < 0) {
    return { ok: false, error: "Informe um troco válido." };
  }

  const saleItems = buildSaleItems(input.items, products);
  if (saleItems.length === 0) {
    return { ok: false, error: "Nenhum item válido na venda." };
  }

  const total = saleItems.reduce((sum, item) => sum + item.subtotal, 0);
  if (input.paymentMethod === "cash" && input.amountReceived < total) {
    return { ok: false, error: "O valor recebido deve ser maior ou igual ao total." };
  }

  return { ok: true };
}

export function buildSaleFromInput(
  input: SaleFormInput,
  products: Product[],
  id: string,
  current?: Sale,
): Sale {
  const items = buildSaleItems(input.items, products);
  const total = items.reduce((sum, item) => sum + item.subtotal, 0);
  const description = items
    .map((item) => `${item.quantity}x ${item.productName}`)
    .join(", ");

  let source = current?.source ?? "manual";
  if (current?.source === "table") {
    source = "adjusted";
  }

  return {
    id,
    tableNumber: input.tableNumber,
    openedAt: input.openedAt,
    paidAt: input.paidAt,
    paymentMethod: input.paymentMethod,
    amountReceived: input.paymentMethod === "card" ? total : input.amountReceived,
    change: input.paymentMethod === "card" ? 0 : input.change,
    total,
    items,
    description,
    source,
    adjustmentReason: input.reason.trim(),
  };
}

export function toApiSalePayload(input: SaleFormInput): Record<string, unknown> {
  return {
    tableNumber: input.tableNumber,
    paidAt: input.paidAt,
    openedAt: input.openedAt,
    paymentMethod: input.paymentMethod,
    amountReceived: input.amountReceived,
    change: input.change,
    items: input.items,
    reason: input.reason.trim(),
  };
}
