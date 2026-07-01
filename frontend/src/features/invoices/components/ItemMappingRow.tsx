"use client";

import { useMemo, useState } from "react";
import { Check, Plus, SkipForward } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIngredients } from "@/features/menu/hooks/useProducts";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { cn } from "@/lib/utils";

import type { ItemMappingState } from "../types";
import { ProductQuickCreateDialog } from "./ProductQuickCreateDialog";

interface ItemMappingRowProps {
  mapping: ItemMappingState;
  onSelectProduct: (productId: string) => void;
  onSkip: () => void;
  onConfirm: () => void;
  onQuantityChange: (quantity: number) => void;
  onUnitCostChange: (unitCost: number) => void;
}

export function ItemMappingRow({
  mapping,
  onSelectProduct,
  onSkip,
  onConfirm,
  onQuantityChange,
  onUnitCostChange,
}: ItemMappingRowProps) {
  const { formatCurrency } = useSettings();
  const ingredients = useIngredients();
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const topSuggestions = mapping.suggestions.slice(0, 5);

  const selectedProduct = useMemo(
    () => ingredients.find((product) => product.id === mapping.selectedProductId),
    [ingredients, mapping.selectedProductId],
  );

  const filteredProducts = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) {
      return [];
    }

    return ingredients
      .filter((product) => product.name.toLowerCase().includes(normalized))
      .slice(0, 10);
  }, [ingredients, searchQuery]);

  const status = mapping.action === "skip"
    ? "ignored"
    : mapping.confirmed
      ? "confirmed"
      : "pending";

  const canConfirm =
    mapping.action !== "skip" && mapping.selectedProductId !== null && mapping.quantity > 0;

  return (
    <>
      <tr
        className={cn(
          "border-b border-border last:border-0",
          status === "confirmed" && "bg-emerald-50/40 dark:bg-emerald-950/10",
          status === "ignored" && "bg-muted/30 opacity-70",
        )}
      >
        <td className="px-3 py-3 align-top">
          <StatusBadge status={status} />
        </td>
        <td className="px-3 py-3 align-top text-muted-foreground">{mapping.lineNumber}</td>
        <td className="min-w-48 px-3 py-3 align-top">
          <p className="font-medium text-foreground">{mapping.draftItem.description}</p>
          {mapping.draftItem.externalCode ? (
            <p className="mt-0.5 text-xs text-muted-foreground">EAN {mapping.draftItem.externalCode}</p>
          ) : null}
        </td>
        <td className="px-3 py-3 align-top">
          <Input
            type="number"
            min="0"
            step="any"
            value={mapping.quantity}
            disabled={mapping.action === "skip"}
            onChange={(event) => {
              const value = Number.parseFloat(event.target.value);
              if (Number.isFinite(value)) {
                onQuantityChange(value);
              }
            }}
            className="h-9 w-20 rounded-lg px-2"
          />
        </td>
        <td className="px-3 py-3 align-top text-sm text-muted-foreground">{mapping.packType}</td>
        <td className="px-3 py-3 align-top">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={mapping.unitCost}
            disabled={mapping.action === "skip"}
            onChange={(event) => {
              const value = Number.parseFloat(event.target.value);
              if (Number.isFinite(value)) {
                onUnitCostChange(value);
              }
            }}
            className="h-9 w-24 rounded-lg px-2"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {formatCurrency(mapping.quantity * mapping.unitCost)}
          </p>
        </td>
        <td className="min-w-56 px-3 py-3 align-top">
          {mapping.action === "skip" ? (
            <span className="text-sm text-muted-foreground">Ignorado</span>
          ) : (
            <div className="space-y-2">
              <select
                value={mapping.selectedProductId ?? ""}
                onChange={(event) => {
                  const productId = event.target.value;
                  if (productId) {
                    onSelectProduct(productId);
                  }
                }}
                className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
              >
                <option value="">Selecionar produto…</option>
                {topSuggestions.length > 0 ? (
                  <optgroup label="Sugestões">
                    {topSuggestions.map((suggestion) => (
                      <option key={suggestion.productId} value={suggestion.productId}>
                        {suggestion.productName} ({Math.round(suggestion.score)}%)
                      </option>
                    ))}
                  </optgroup>
                ) : null}
                {selectedProduct &&
                !topSuggestions.some((suggestion) => suggestion.productId === selectedProduct.id) &&
                !filteredProducts.some((product) => product.id === selectedProduct.id) ? (
                  <optgroup label="Selecionado">
                    <option value={selectedProduct.id}>{selectedProduct.name}</option>
                  </optgroup>
                ) : null}
                {filteredProducts.length > 0 ? (
                  <optgroup label="Busca">
                    {filteredProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
              </select>

              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Buscar insumo…"
                className="h-8 rounded-lg px-2 text-xs"
              />

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 rounded-lg px-2 text-xs"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="size-3" />
                Cadastrar novo
              </Button>
            </div>
          )}
        </td>
        <td className="px-3 py-3 align-top">
          <div className="flex flex-wrap gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 rounded-lg"
              disabled={!canConfirm || mapping.confirmed}
              onClick={onConfirm}
            >
              <Check className="size-3.5" />
              Confirmar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 rounded-lg"
              disabled={mapping.action === "skip"}
              onClick={onSkip}
            >
              <SkipForward className="size-3.5" />
              Pular
            </Button>
          </div>
        </td>
      </tr>

      <ProductQuickCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultName={mapping.draftItem.description}
        packType={mapping.packType}
        onCreated={(productId) => {
          onSelectProduct(productId);
          onConfirm();
        }}
      />
    </>
  );
}

function StatusBadge({ status }: { status: "pending" | "confirmed" | "ignored" }) {
  const labels = {
    pending: "Pendente",
    confirmed: "Confirmado",
    ignored: "Ignorado",
  };

  const styles = {
    pending: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    confirmed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    ignored: "bg-muted text-muted-foreground",
  };

  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", styles[status])}>
      {labels[status]}
    </span>
  );
}
