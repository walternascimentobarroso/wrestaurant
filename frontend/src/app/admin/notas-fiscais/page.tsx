import { Suspense } from "react";

import { AdminInvoiceImportsPage } from "@/features/invoices/components/AdminInvoiceImportsPage";

export default function AdminNotasFiscaisPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">A carregar…</div>}>
      <AdminInvoiceImportsPage />
    </Suspense>
  );
}
