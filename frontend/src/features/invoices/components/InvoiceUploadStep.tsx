"use client";

import { useCallback, useRef, useState } from "react";
import { FileUp, Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { cn } from "@/lib/utils";

import { getInvoiceUploadErrorMessage } from "../hooks/useInvoiceImport";
import type { InvoiceDraft } from "../types";

interface InvoiceUploadStepProps {
  onUpload: (file: File) => Promise<InvoiceDraft>;
  draft: InvoiceDraft | null;
  onContinue: () => void;
}

export function InvoiceUploadStep({ onUpload, draft, onContinue }: InvoiceUploadStepProps) {
  const { formatCurrency } = useSettings();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const processFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        setError("Apenas ficheiros PDF são aceites.");
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        await onUpload(file);
      } catch (uploadError) {
        setError(getInvoiceUploadErrorMessage(uploadError));
      } finally {
        setIsLoading(false);
      }
    },
    [onUpload],
  );

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      void processFile(file);
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files[0];
    if (file) {
      void processFile(file);
    }
  }

  const previewDraft = draft;

  return (
    <div className="space-y-6">
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex min-h-48 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border bg-card hover:border-primary/50 hover:bg-muted/30",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />

        {isLoading ? (
          <>
            <Loader2 className="size-10 animate-spin text-primary" />
            <p className="text-sm font-medium text-foreground">A analisar o PDF…</p>
          </>
        ) : (
          <>
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Upload className="size-7" />
            </div>
            <div className="text-center">
              <p className="font-medium text-foreground">Arraste o PDF da fatura ou clique para selecionar</p>
              <p className="mt-1 text-sm text-muted-foreground">Apenas ficheiros .pdf</p>
            </div>
          </>
        )}
      </div>

      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {previewDraft ? (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-elevated">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileUp className="size-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Fornecedor extraído</p>
                <p className="font-medium text-foreground">
                  {previewDraft.supplier.legalName}
                  {previewDraft.supplier.storeName
                    ? ` — ${previewDraft.supplier.storeName}`
                    : null}
                </p>
                <p className="text-sm text-muted-foreground">NIF: {previewDraft.supplier.taxId}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Número da fatura</p>
                  <p className="font-medium text-foreground">
                    {previewDraft.invoiceNumber ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data</p>
                  <p className="font-medium text-foreground">
                    {new Date(previewDraft.issueDate).toLocaleDateString("pt-PT")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="font-medium text-foreground">
                    {formatCurrency(previewDraft.totals.totalIncVat)}
                  </p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                {previewDraft.items.length}{" "}
                {previewDraft.items.length === 1 ? "item encontrado" : "itens encontrados"}
              </p>

              <Button type="button" className="rounded-xl" onClick={onContinue}>
                Continuar para fornecedor
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
