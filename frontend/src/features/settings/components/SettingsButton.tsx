"use client";

import { Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { CURRENCY_OPTIONS } from "../data/currencies";
import { useSettings } from "../hooks/useSettings";
import type { CurrencyCode } from "../types";

export function SettingsButton() {
  const { currency, setCurrency } = useSettings();

  function handleSelect(code: CurrencyCode) {
    setCurrency(code);
  }

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            className="size-12 rounded-2xl"
            aria-label="Configurações"
          />
        }
      >
        <Settings className="size-5" />
      </DialogTrigger>

      <DialogContent className="max-w-md rounded-3xl p-6 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Configurações</DialogTitle>
          <DialogDescription>Moeda exibida nos valores</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {CURRENCY_OPTIONS.map((option) => {
            const isSelected = currency === option.code;

            return (
              <Button
                key={option.code}
                type="button"
                variant="outline"
                onClick={() => handleSelect(option.code)}
                className={cn(
                  "h-auto min-h-14 w-full justify-between rounded-2xl border-2 px-5 py-4 text-left",
                  isSelected && "border-primary bg-primary/10",
                )}
              >
                <span className="text-base font-semibold">{option.label}</span>
                <span className="text-sm font-medium text-muted-foreground">
                  {option.code}
                </span>
              </Button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
