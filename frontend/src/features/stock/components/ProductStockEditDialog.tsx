"use client";

import { useMemo, useState } from "react";

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
import { isIngredient } from "@/features/recipes/utils/productKind";
import {
  setPhysicalInventory,
  updateStockProductMetadata,
} from "@/features/stock/services/stockService";
import {
  formatStockAmount,
  getStockUnitLabel,
  STOCK_UNIT_LABELS,
} from "@/features/stock/utils/stockUnits";
import type { Product, StockUnit } from "@/features/tables/types";

interface ProductStockEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}

interface FormState {
  name: string;
  minStock: string;
  stockUnit: StockUnit;
  inventoryQuantity: string;
  inventoryReason: string;
}

function buildFormState(product: Product): FormState {
  return {
    name: product.name,
    minStock: String(product.minStock),
    stockUnit: product.stockUnit ?? "un",
    inventoryQuantity: String(product.stockQuantity),
    inventoryReason: "",
  };
}

function parseQuantity(value: string, allowDecimals: boolean): number | null {
  const parsed = allowDecimals
    ? Number.parseFloat(value.replace(",", "."))
    : Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

interface ProductStockEditFormProps {
  product: Product;
  onOpenChange: (open: boolean) => void;
}

function ProductStockEditForm({ product, onOpenChange }: ProductStockEditFormProps) {
  const [form, setForm] = useState<FormState>(() => buildFormState(product));
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allowDecimals = isIngredient(product);
  const unitLabel = getStockUnitLabel(product);

  const parsedMinStock = parseQuantity(form.minStock, allowDecimals);
  const parsedInventoryQuantity = parseQuantity(form.inventoryQuantity, allowDecimals);

  const inventoryDelta = useMemo(() => {
    if (parsedInventoryQuantity === null) {
      return null;
    }

    return parsedInventoryQuantity - product.stockQuantity;
  }, [product.stockQuantity, parsedInventoryQuantity]);

  const metadataChanged = useMemo(() => {
    return (
      form.name.trim() !== product.name ||
      parsedMinStock !== product.minStock ||
      (isIngredient(product) && form.stockUnit !== (product.stockUnit ?? "un"))
    );
  }, [form.name, form.stockUnit, parsedMinStock, product]);

  const inventoryChanged = inventoryDelta !== null && inventoryDelta !== 0;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = form.name.trim();
    if (!name) {
      setError("Informe o nome do produto.");
      return;
    }

    if (parsedMinStock === null) {
      setError("Informe um estoque mínimo válido.");
      return;
    }

    if (parsedInventoryQuantity === null) {
      setError("Informe uma quantidade de inventário válida.");
      return;
    }

    if (inventoryChanged && !form.inventoryReason.trim()) {
      setError("Informe o motivo da contagem de inventário.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    if (metadataChanged) {
      const metadataResult = await updateStockProductMetadata(product.id, {
        name,
        minStock: parsedMinStock,
        ...(isIngredient(product) ? { stockUnit: form.stockUnit } : {}),
      });

      if (!metadataResult.ok) {
        setError(metadataResult.error ?? "Não foi possível atualizar o produto.");
        setIsSubmitting(false);
        return;
      }
    }

    if (inventoryChanged) {
      const inventoryResult = await setPhysicalInventory(
        product.id,
        product.stockQuantity,
        parsedInventoryQuantity,
        form.inventoryReason.trim(),
      );

      if (!inventoryResult.ok) {
        setError(inventoryResult.error ?? "Não foi possível registrar o inventário.");
        setIsSubmitting(false);
        return;
      }
    }

    setIsSubmitting(false);
    onOpenChange(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="stock-edit-name" className="text-sm font-medium">
          Nome
        </label>
        <Input
          id="stock-edit-name"
          value={form.name}
          onChange={(event) => {
            setForm((current) => ({ ...current, name: event.target.value }));
            setError("");
          }}
          className="h-11 rounded-xl px-3"
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="stock-edit-min" className="text-sm font-medium">
          Estoque mínimo ({unitLabel})
        </label>
        <Input
          id="stock-edit-min"
          type="number"
          min={0}
          step={allowDecimals ? 0.01 : 1}
          value={form.minStock}
          onChange={(event) => {
            setForm((current) => ({ ...current, minStock: event.target.value }));
            setError("");
          }}
          className="h-11 rounded-xl px-3"
        />
      </div>

      {isIngredient(product) ? (
        <div className="space-y-2">
          <label htmlFor="stock-edit-unit" className="text-sm font-medium">
            Unidade de estoque
          </label>
          <select
            id="stock-edit-unit"
            value={form.stockUnit}
            onChange={(event) => {
              setForm((current) => ({
                ...current,
                stockUnit: event.target.value as StockUnit,
              }));
              setError("");
            }}
            className="h-11 w-full rounded-xl border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {(Object.keys(STOCK_UNIT_LABELS) as StockUnit[]).map((unit) => (
              <option key={unit} value={unit}>
                {STOCK_UNIT_LABELS[unit]}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="space-y-3 rounded-2xl border border-border p-4">
        <div>
          <p className="text-sm font-medium text-foreground">Inventário físico</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Estoque atual: {formatStockAmount(product)}
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="stock-edit-quantity" className="text-sm font-medium">
            Nova quantidade ({unitLabel})
          </label>
          <Input
            id="stock-edit-quantity"
            type="number"
            min={0}
            step={allowDecimals ? 0.01 : 1}
            value={form.inventoryQuantity}
            onChange={(event) => {
              setForm((current) => ({
                ...current,
                inventoryQuantity: event.target.value,
              }));
              setError("");
            }}
            className="h-11 rounded-xl px-3"
          />
        </div>

        {inventoryChanged && inventoryDelta !== null ? (
          <p className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            Ajuste:{" "}
            <span className="font-semibold text-foreground">
              {inventoryDelta > 0 ? "+" : ""}
              {inventoryDelta} {unitLabel}
            </span>
          </p>
        ) : null}

        <div className="space-y-2">
          <label htmlFor="stock-edit-reason" className="text-sm font-medium">
            Motivo da contagem
          </label>
          <Input
            id="stock-edit-reason"
            value={form.inventoryReason}
            onChange={(event) => {
              setForm((current) => ({
                ...current,
                inventoryReason: event.target.value,
              }));
              setError("");
            }}
            className="h-11 rounded-xl px-3"
            placeholder="Ex.: Contagem de estoque"
          />
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
        <Button
          type="button"
          variant="outline"
          className="rounded-xl"
          onClick={() => onOpenChange(false)}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          className="rounded-xl"
          disabled={isSubmitting || (!metadataChanged && !inventoryChanged)}
        >
          Salvar
        </Button>
      </DialogFooter>
    </form>
  );
}

export function ProductStockEditDialog({
  open,
  onOpenChange,
  product,
}: ProductStockEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Editar produto</DialogTitle>
          <DialogDescription>
            {product
              ? `Atualize nome, mínimo e contagem física de ${product.name}.`
              : null}
          </DialogDescription>
        </DialogHeader>

        {product ? (
          <ProductStockEditForm
            key={product.id}
            product={product}
            onOpenChange={onOpenChange}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
