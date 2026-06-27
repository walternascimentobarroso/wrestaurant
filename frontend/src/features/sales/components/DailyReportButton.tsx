"use client";

import { ClipboardList } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { DailyReportPanel } from "./DailyReportPanel";
import { useSales } from "../hooks/useSales";
import { formatReportDate } from "../utils/formatReportDate";

export function DailyReportButton() {
  const { dailySales } = useSales();

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            className="size-12 rounded-2xl shadow-pressed hover:-translate-y-px hover:shadow-elevated active:translate-y-px active:shadow-pressed"
            aria-label="Relatório do dia"
          />
        }
      >
        <ClipboardList className="size-5" />
      </DialogTrigger>

      <DialogContent className="flex max-h-[85dvh] max-w-lg flex-col rounded-3xl p-0 sm:max-w-lg">
        <div className="shrink-0 border-b border-border px-6 py-5">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Relatório do dia</DialogTitle>
            <DialogDescription className="capitalize">
              {formatReportDate(new Date())}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <DailyReportPanel sales={dailySales} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
