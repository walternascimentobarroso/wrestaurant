import type { CurrencyCode, CurrencyOption } from "../types";

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: "BRL", label: "Real brasileiro", locale: "pt-BR" },
  { code: "EUR", label: "Euro", locale: "pt-PT" },
  { code: "USD", label: "Dólar americano", locale: "en-US" },
];

export const DEFAULT_CURRENCY: CurrencyCode = "EUR";

export function getCurrencyOption(code: CurrencyCode): CurrencyOption {
  return (
    CURRENCY_OPTIONS.find((option) => option.code === code) ?? CURRENCY_OPTIONS[1]
  );
}
