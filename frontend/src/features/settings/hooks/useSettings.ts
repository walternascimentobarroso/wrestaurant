"use client";

import { useCallback, useSyncExternalStore } from "react";

import { getCurrencyOption } from "../data/currencies";
import {
  getSettingsServerSnapshot,
  getSettingsSnapshot,
  persistCurrency,
  subscribeSettings,
} from "../services/settingsStorage";
import type { CurrencyCode } from "../types";

export function useSettings() {
  const settings = useSyncExternalStore(
    subscribeSettings,
    getSettingsSnapshot,
    getSettingsServerSnapshot,
  );

  const setCurrency = useCallback((currency: CurrencyCode) => {
    persistCurrency(currency);
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

  return {
    currency: settings.currency,
    setCurrency,
    formatCurrency,
  };
}
