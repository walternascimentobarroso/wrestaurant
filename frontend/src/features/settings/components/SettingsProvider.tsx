"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { getCurrencyOption } from "../data/currencies";
import {
  getSettingsServerSnapshot,
  getSettingsSnapshot,
  persistCurrency,
  subscribeSettings,
} from "../services/settingsStorage";
import type { CurrencyCode } from "../types";

export interface SettingsContextValue {
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
  formatCurrency: (value: number) => string;
}

export const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const settings = useSyncExternalStore(
    subscribeSettings,
    getSettingsSnapshot,
    getSettingsServerSnapshot,
  );

  const setCurrency = useCallback((currency: CurrencyCode) => {
    void persistCurrency(currency);
  }, []);

  const formatCurrency = useCallback(
    (value: number): string => {
      const option = getCurrencyOption(settings.currency);
      return value.toLocaleString(option.locale, {
        style: "currency",
        currency: option.code,
      });
    },
    [settings.currency],
  );

  const value = useMemo(
    () => ({
      currency: settings.currency,
      setCurrency,
      formatCurrency,
    }),
    [settings.currency, setCurrency, formatCurrency],
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettingsContext(): SettingsContextValue {
  const value = useContext(SettingsContext);
  if (!value) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return value;
}
