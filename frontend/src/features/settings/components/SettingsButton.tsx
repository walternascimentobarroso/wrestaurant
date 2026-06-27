"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Settings, ShieldCheck } from "lucide-react";

import { AdminPasswordDialog } from "@/features/admin/components/AdminPasswordDialog";
import { useAdminAuth } from "@/features/admin/hooks/useAdminAuth";
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
  const router = useRouter();
  const { currency, setCurrency } = useSettings();
  const { login } = useAdminAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);

  function handleSelect(code: CurrencyCode) {
    setCurrency(code);
  }

  function handleOpenAdmin() {
    setSettingsOpen(false);
    setAdminDialogOpen(true);
  }

  function handleAdminSuccess() {
    router.push("/admin/mesas");
  }

  return (
    <>
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            className="size-12 rounded-2xl shadow-pressed hover:-translate-y-px hover:shadow-elevated active:translate-y-px active:shadow-pressed"
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

        <div className="border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleOpenAdmin}
            className="h-auto min-h-14 w-full justify-start gap-3 rounded-2xl border-2 px-5 py-4 text-left"
          >
            <ShieldCheck className="size-5 shrink-0 text-primary" />
            <span>
              <span className="block text-base font-semibold">Área administrativa</span>
              <span className="block text-sm font-normal text-muted-foreground">
                Cadastrar mesas e gerenciar o salão
              </span>
            </span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <AdminPasswordDialog
      open={adminDialogOpen}
      onOpenChange={setAdminDialogOpen}
      onLogin={login}
      onSuccess={handleAdminSuccess}
    />
    </>
  );
}
