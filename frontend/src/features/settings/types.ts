export type CurrencyCode = "BRL" | "EUR" | "USD";

export interface AppSettings {
  currency: CurrencyCode;
}

export interface CurrencyOption {
  code: CurrencyCode;
  label: string;
  locale: string;
}
