"use client";

import { useState } from "react";

import { CURRENCY_OPTIONS } from "../data/currencies";
import { useSettings } from "../hooks/useSettings";
import type { CurrencyCode } from "../types";

export function SettingsButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { currency, setCurrency } = useSettings();

  function handleSelect(code: CurrencyCode) {
    setCurrency(code);
    setIsOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-xl text-zinc-700 transition active:scale-95 active:bg-zinc-200"
        aria-label="Configurações"
      >
        ⚙
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Fechar configurações"
            onClick={() => setIsOpen(false)}
          />

          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-zinc-900">Configurações</h2>
            <p className="mt-1 text-sm text-zinc-500">Moeda exibida nos valores</p>

            <div className="mt-6 space-y-3">
              {CURRENCY_OPTIONS.map((option) => {
                const isSelected = currency === option.code;

                return (
                  <button
                    key={option.code}
                    type="button"
                    onClick={() => handleSelect(option.code)}
                    className={`flex min-h-14 w-full items-center justify-between rounded-2xl border-2 px-5 text-left transition active:scale-[0.98] ${
                      isSelected
                        ? "border-amber-500 bg-amber-50"
                        : "border-zinc-200 bg-white active:bg-zinc-50"
                    }`}
                  >
                    <span className="text-base font-semibold text-zinc-900">
                      {option.label}
                    </span>
                    <span className="text-sm font-medium text-zinc-500">
                      {option.code}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="mt-6 flex min-h-12 w-full items-center justify-center rounded-2xl bg-zinc-100 text-base font-semibold text-zinc-700 active:scale-[0.98] active:bg-zinc-200"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
