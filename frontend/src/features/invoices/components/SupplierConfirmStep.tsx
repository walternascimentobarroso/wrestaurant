"use client";

import { useState } from "react";
import { Building2, Check, ChevronDown, Plus, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useSuppliers } from "@/features/suppliers/hooks/useSuppliers";
import { getSuppliersSnapshot } from "@/features/suppliers/services/supplierStorage";
import type { Supplier, SupplierInput } from "@/features/suppliers/types";
import { cn } from "@/lib/utils";

import type { InvoiceDraft, SupplierSuggestion } from "../types";

interface SupplierConfirmStepProps {
  draft: InvoiceDraft;
  suggestions: SupplierSuggestion[];
  confirmedSupplierId: string | null;
  onConfirm: (supplierId: string) => Promise<void>;
  isLoading?: boolean;
}

interface SupplierFormState {
  name: string;
  legalName: string;
  tradeName: string;
  taxId: string;
}

function buildSupplierName(draft: InvoiceDraft): string {
  return draft.supplier.storeName ?? draft.supplier.legalName;
}

export function SupplierConfirmStep({
  draft,
  suggestions,
  confirmedSupplierId,
  onConfirm,
  isLoading = false,
}: SupplierConfirmStepProps) {
  const { suppliers, createSupplier } = useSuppliers();
  const topSuggestion = suggestions[0] ?? null;

  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const effectiveSelectedId = selectedSupplierId ?? topSuggestion?.supplierId ?? null;
  const [showSupplierPicker, setShowSupplierPicker] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<SupplierFormState>({
    name: buildSupplierName(draft),
    legalName: draft.supplier.legalName,
    tradeName: draft.supplier.storeName ?? "",
    taxId: draft.supplier.taxId,
  });
  const [createError, setCreateError] = useState("");

  const selectedSupplier = suppliers.find((supplier) => supplier.id === effectiveSelectedId);
  const selectedSuggestion = suggestions.find(
    (suggestion) => suggestion.supplierId === effectiveSelectedId,
  );

  async function handleConfirmSuggestion() {
    if (!effectiveSelectedId) {
      setConfirmError("Selecione um fornecedor para continuar.");
      return;
    }

    setIsConfirming(true);
    setConfirmError("");

    try {
      await onConfirm(effectiveSelectedId);
    } catch (error) {
      setConfirmError(
        error instanceof Error ? error.message : "Não foi possível confirmar o fornecedor.",
      );
    } finally {
      setIsConfirming(false);
    }
  }

  async function handleCreateSupplier(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const input: SupplierInput = {
      name: createForm.name,
      legalName: createForm.legalName || undefined,
      tradeName: createForm.tradeName || undefined,
      taxId: createForm.taxId || undefined,
    };

    const result = await createSupplier(input);
    if (!result.ok) {
      setCreateError(result.error ?? "Não foi possível cadastrar o fornecedor.");
      return;
    }

    const created = getSuppliersSnapshot().find(
      (supplier) => supplier.name === input.name.trim(),
    );
    if (created) {
      setSelectedSupplierId(created.id);
    }

    setCreateOpen(false);
    setCreateError("");
  }

  if (confirmedSupplierId && selectedSupplier) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 dark:border-emerald-900 dark:bg-emerald-950/20">
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
          <Check className="size-5" />
          <p className="font-medium">Fornecedor confirmado</p>
        </div>
        <p className="mt-2 font-medium text-foreground">{selectedSupplier.name}</p>
        {selectedSupplier.taxId ? (
          <p className="text-sm text-muted-foreground">NIF: {selectedSupplier.taxId}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-elevated">
        <p className="text-sm font-medium text-muted-foreground">A fatura indica:</p>
        <p className="mt-2 text-lg font-semibold text-foreground">
          {draft.supplier.legalName}
          {draft.supplier.storeName ? ` — ${draft.supplier.storeName}` : null}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">NIF: {draft.supplier.taxId}</p>
      </div>

      {topSuggestion ? (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
          <div className="flex items-start gap-3">
            <Star className="mt-0.5 size-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">
                Sugestão: {topSuggestion.supplierName}{" "}
                <span className="text-primary">(score {Math.round(topSuggestion.score)})</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{topSuggestion.reason}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          Nenhuma sugestão automática encontrada. Selecione ou cadastre um fornecedor.
        </div>
      )}

      {selectedSuggestion && effectiveSelectedId === topSuggestion?.supplierId ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            className="rounded-xl"
            disabled={isConfirming || isLoading}
            onClick={handleConfirmSuggestion}
          >
            {isConfirming || isLoading ? "A processar…" : "Confirmar sugestão"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => setShowSupplierPicker((current) => !current)}
          >
            Escolher outro
            <ChevronDown className="size-4" />
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <label htmlFor="supplier-picker" className="text-sm font-medium">
            Selecionar fornecedor
          </label>
          <select
            id="supplier-picker"
            value={effectiveSelectedId ?? ""}
            onChange={(event) => {
              setSelectedSupplierId(event.target.value || null);
              setConfirmError("");
            }}
            className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
          >
            <option value="">Selecione…</option>
            {suggestions.length > 0 ? (
              <optgroup label="Sugestões">
                {suggestions.map((suggestion) => (
                  <option key={suggestion.supplierId} value={suggestion.supplierId}>
                    {suggestion.supplierName} (score {Math.round(suggestion.score)})
                  </option>
                ))}
              </optgroup>
            ) : null}
            <optgroup label="Todos os fornecedores">
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                  {supplier.taxId ? ` — NIF ${supplier.taxId}` : ""}
                </option>
              ))}
            </optgroup>
          </select>

          <Button
            type="button"
            className="rounded-xl"
            disabled={!effectiveSelectedId || isConfirming || isLoading}
            onClick={handleConfirmSuggestion}
          >
            Confirmar fornecedor
          </Button>
        </div>
      )}

      {(showSupplierPicker || (effectiveSelectedId && effectiveSelectedId !== topSuggestion?.supplierId)) ? (
        <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-4">
          <label htmlFor="supplier-alt-picker" className="text-sm font-medium">
            Escolher outro fornecedor
          </label>
          <select
            id="supplier-alt-picker"
            value={effectiveSelectedId ?? ""}
            onChange={(event) => {
              setSelectedSupplierId(event.target.value || null);
              setConfirmError("");
            }}
            className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
          >
            <option value="">Selecione…</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
                {supplier.taxId ? ` — NIF ${supplier.taxId}` : ""}
              </option>
            ))}
          </select>

          {selectedSupplier ? (
            <SupplierPreview supplier={selectedSupplier} suggestion={selectedSuggestion} />
          ) : null}

          <Button
            type="button"
            className="rounded-xl"
            disabled={!effectiveSelectedId || isConfirming || isLoading}
            onClick={handleConfirmSuggestion}
          >
            Confirmar fornecedor
          </Button>
        </div>
      ) : null}

      <Button
        type="button"
        variant="outline"
        className="rounded-xl"
        onClick={() => {
          setCreateForm({
            name: buildSupplierName(draft),
            legalName: draft.supplier.legalName,
            tradeName: draft.supplier.storeName ?? "",
            taxId: draft.supplier.taxId,
          });
          setCreateError("");
          setCreateOpen(true);
        }}
      >
        <Plus className="size-4" />
        Cadastrar novo fornecedor
      </Button>

      {confirmError ? <p className="text-sm text-destructive">{confirmError}</p> : null}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Cadastrar fornecedor</DialogTitle>
            <DialogDescription>
              Dados pré-preenchidos a partir da fatura.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSupplier} className="space-y-4">
            <FormField
              id="supplier-create-name"
              label="Nome"
              value={createForm.name}
              onChange={(value) => setCreateForm((current) => ({ ...current, name: value }))}
            />
            <FormField
              id="supplier-create-legal"
              label="Razão social"
              value={createForm.legalName}
              onChange={(value) => setCreateForm((current) => ({ ...current, legalName: value }))}
            />
            <FormField
              id="supplier-create-trade"
              label="Nome comercial"
              value={createForm.tradeName}
              onChange={(value) => setCreateForm((current) => ({ ...current, tradeName: value }))}
            />
            <FormField
              id="supplier-create-tax"
              label="NIF"
              value={createForm.taxId}
              onChange={(value) => setCreateForm((current) => ({ ...current, taxId: value }))}
            />

            {createError ? <p className="text-sm text-destructive">{createError}</p> : null}

            <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="rounded-xl">
                Cadastrar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SupplierPreview({
  supplier,
  suggestion,
}: {
  supplier: Supplier;
  suggestion?: SupplierSuggestion;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
      <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Building2 className="size-4" />
      </div>
      <div>
        <p className="font-medium text-foreground">{supplier.name}</p>
        {supplier.taxId ? (
          <p className="text-sm text-muted-foreground">NIF: {supplier.taxId}</p>
        ) : null}
        {suggestion ? (
          <p className={cn("text-sm", suggestion.score >= 90 ? "text-primary" : "text-muted-foreground")}>
            Score {Math.round(suggestion.score)} — {suggestion.reason}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function FormField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-xl px-3"
      />
    </div>
  );
}
