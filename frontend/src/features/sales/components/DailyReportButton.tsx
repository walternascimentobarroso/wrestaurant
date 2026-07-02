"use client";

import Link from "next/link";
import { ClipboardList } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DailyReportButtonProps {
  className?: string;
}

export function DailyReportButton({ className }: DailyReportButtonProps) {
  return (
    <Link
      href="/relatorios"
      aria-label="Relatório do dia"
      className={cn(
        buttonVariants({ variant: "outline", size: "icon-lg" }),
        "size-12 rounded-2xl shadow-pressed hover:-translate-y-px hover:shadow-elevated active:translate-y-px active:shadow-pressed",
        className,
      )}
    >
      <ClipboardList className="size-5" />
    </Link>
  );
}
