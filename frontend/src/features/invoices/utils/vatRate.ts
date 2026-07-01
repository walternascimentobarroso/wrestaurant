export type VatRate = 0 | 6 | 23;

export const VAT_RATE_OPTIONS: { value: VatRate; label: string }[] = [
  { value: 0, label: "0%" },
  { value: 6, label: "6%" },
  { value: 23, label: "23%" },
];

/** MAKRO Portugal IvaDD → taxa IVA (editável na UI). */
export function resolveVatRateFromCode(vatCode?: string | null): VatRate {
  if (vatCode === "4") {
    return 6;
  }
  if (vatCode === "5") {
    return 0;
  }
  return 23;
}

export function unitCostWithVat(unitCost: number, vatRate: VatRate): number {
  return unitCost * (1 + vatRate / 100);
}

export function lineTotalWithVat(
  quantity: number,
  unitCost: number,
  vatRate: VatRate,
): number {
  return quantity * unitCostWithVat(unitCost, vatRate);
}
