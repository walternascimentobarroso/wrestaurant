"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, FileUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useInvoiceImport } from "../hooks/useInvoiceImport";
import { InvoiceReviewStep } from "./InvoiceReviewStep";
import { InvoiceUploadStep } from "./InvoiceUploadStep";
import { ItemMappingStep } from "./ItemMappingStep";
import { SupplierConfirmStep } from "./SupplierConfirmStep";
import type { InvoiceImportStep } from "../types";

const STEPS: { id: InvoiceImportStep; label: string }[] = [
  { id: "upload", label: "Upload" },
  { id: "supplier", label: "Fornecedor" },
  { id: "items", label: "Itens" },
  { id: "review", label: "Revisão" },
];

export function InvoiceImportWizard() {
  const router = useRouter();
  const {
    state,
    uploadAndParse,
    confirmSupplier,
    selectProduct,
    skipItem,
    confirmItem,
    updateItemQuantity,
    updateItemUnitCost,
    confirmAllHighConfidence,
    getProgress,
    goToStep,
    setPurchasedAt,
    setNotes,
    setCreatePayable,
    resetWizard,
    confirmImport,
    isConfirming,
    confirmError,
  } = useInvoiceImport();

  const [isConfirmingSupplier, setIsConfirmingSupplier] = useState(false);
  const progress = getProgress();

  const currentStepIndex = STEPS.findIndex((step) => step.id === state.step);

  async function handleConfirmSupplier(supplierId: string) {
    setIsConfirmingSupplier(true);
    try {
      await confirmSupplier(supplierId);
    } finally {
      setIsConfirmingSupplier(false);
    }
  }

  async function handleConfirmImport() {
    try {
      await confirmImport();
      router.push("/admin/notas-fiscais?imported=1");
    } catch {
      // Error state is handled in the hook.
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b border-border bg-card px-6 py-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-heading text-xl font-bold text-foreground">Importar nota fiscal</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Envie o PDF, confirme fornecedor e mapeie os produtos
            </p>
          </div>
          {state.draft ? (
            <Button type="button" variant="outline" className="rounded-xl" onClick={resetWizard}>
              Nova importação
            </Button>
          ) : null}
        </div>

        <nav className="mt-5 flex flex-wrap gap-2">
          {STEPS.map((step, index) => {
            const isActive = state.step === step.id;
            const isComplete = index < currentStepIndex;

            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium",
                  isActive
                    ? "bg-primary/15 text-foreground"
                    : isComplete
                      ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                      : "bg-muted/50 text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full text-xs",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : isComplete
                        ? "bg-emerald-600 text-white"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {isComplete ? <Check className="size-3.5" /> : index + 1}
                </span>
                {step.label}
              </div>
            );
          })}
        </nav>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {state.step === "upload" ? (
          <InvoiceUploadStep
            draft={state.draft}
            onUpload={uploadAndParse}
            onContinue={() => goToStep("supplier")}
          />
        ) : null}

        {state.step === "supplier" && state.draft ? (
          <div className="space-y-4">
            <SupplierConfirmStep
              draft={state.draft}
              suggestions={state.supplierSuggestions}
              confirmedSupplierId={state.confirmedSupplierId}
              isLoading={isConfirmingSupplier}
              onConfirm={handleConfirmSupplier}
            />
            {state.confirmedSupplierId ? (
              <Button type="button" className="rounded-xl" onClick={() => goToStep("items")}>
                Continuar para itens
              </Button>
            ) : null}
          </div>
        ) : null}

        {state.step === "items" && state.itemMappings.length > 0 ? (
          <ItemMappingStep
            itemMappings={state.itemMappings}
            progress={progress}
            onSelectProduct={selectProduct}
            onSkip={skipItem}
            onConfirm={confirmItem}
            onQuantityChange={updateItemQuantity}
            onUnitCostChange={updateItemUnitCost}
            onConfirmAllHighConfidence={() => confirmAllHighConfidence(90)}
            onContinue={() => goToStep("review")}
          />
        ) : null}

        {state.step === "review" && state.draft && state.confirmedSupplierId ? (
          <InvoiceReviewStep
            draft={state.draft}
            confirmedSupplierId={state.confirmedSupplierId}
            itemMappings={state.itemMappings}
            purchasedAt={state.purchasedAt}
            notes={state.notes}
            createPayable={state.createPayable}
            isConfirming={isConfirming}
            confirmError={confirmError}
            onPurchasedAtChange={setPurchasedAt}
            onNotesChange={setNotes}
            onCreatePayableChange={setCreatePayable}
            onBack={() => goToStep("items")}
            onConfirm={handleConfirmImport}
          />
        ) : null}

        {state.step !== "upload" && !state.draft ? (
          <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border px-6 py-10">
            <FileUp className="size-10 text-muted-foreground/50" />
            <p className="text-muted-foreground">Nenhuma fatura carregada.</p>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => goToStep("upload")}>
              Voltar ao upload
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
