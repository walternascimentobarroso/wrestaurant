import type { PayableStatus } from "../types";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<PayableStatus, string> = {
  pending: "Pendente",
  overdue: "Atrasada",
  paid: "Paga",
  cancelled: "Cancelada",
};

interface PayableStatusBadgeProps {
  status: PayableStatus;
}

export function PayableStatusBadge({ status }: PayableStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        status === "paid" && "bg-primary/15 text-primary",
        status === "pending" && "bg-muted text-muted-foreground",
        status === "overdue" && "bg-destructive/15 text-destructive",
        status === "cancelled" && "bg-muted text-muted-foreground line-through",
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
