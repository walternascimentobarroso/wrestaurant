"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

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
import { getSubcategoryNames } from "@/features/menu/services/menuCatalogStorage";
import { useMenuCatalog } from "@/features/menu/hooks/useMenuCatalog";
import { useProductAdmin, type ProductInput } from "@/features/menu/hooks/useProductAdmin";
import {
  getStockUnitLabelForValues,
  STOCK_UNIT_LABELS,
} from "@/features/stock/utils/stockUnits";
import type { StockUnit } from "@/features/tables/types";

import { packTypeToStockUnit } from "../utils/packType";

interface ProductQuickCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultName: string;
  packType: string;
  supplierId: string | null;
  supplierName?: string | null;
  onCreated: (productId: string) => void;
}

interface QuickCreateFormState {
  name: string;
  category: string;
  subcategory: string;
  stockUnit: StockUnit;
  usesPackage: boolean;
  packageSize: string;
  packageUnit: StockUnit;
  stockQuantity: string;
  minStock: string;
  error: string;
}

export function ProductQuickCreateDialog({
  open,
  onOpenChange,
  defaultName,
  packType,
  supplierId,
  supplierName,
  onCreated,
}: ProductQuickCreateDialogProps) {
  const { categories } = useMenuCatalog();
  const { createProduct } = useProductAdmin();

  const defaultCategory = categories[0]?.name ?? "";
  const defaultSubcategory = getSubcategoryNames(categories, defaultCategory)[0] ?? "";
  const defaultStockUnit = packTypeToStockUnit(packType);

  function createInitialForm(): QuickCreateFormState {
    return {
      name: defaultName,
      category: defaultCategory,
      subcategory: defaultSubcategory,
      stockUnit: defaultStockUnit,
      usesPackage: false,
      packageSize: "",
      packageUnit: "cl",
      stockQuantity: "0",
      minStock: "5",
      error: "",
    };
  }

  const [form, setForm] = useState<QuickCreateFormState>(createInitialForm);

  const subcategoryOptions = useMemo(
    () => getSubcategoryNames(categories, form.category),
    [categories, form.category],
  );

  const stockLabel = getStockUnitLabelForValues(
    form.stockUnit,
    form.usesPackage ? Number.parseFloat(form.packageSize.replace(",", ".")) : undefined,
    form.packageUnit,
  );

  function patchForm(patch: Partial<QuickCreateFormState>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function handleDialogOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setForm(createInitialForm());
    }
    onOpenChange(nextOpen);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsedStockQuantity = Number.parseFloat(form.stockQuantity.replace(",", "."));
    const parsedMinStock = Number.parseFloat(form.minStock.replace(",", "."));
    const parsedPackageSize = form.usesPackage
      ? Number.parseFloat(form.packageSize.replace(",", "."))
      : undefined;

    const input: ProductInput = {
      name: form.name.trim(),
      price: 0,
      category: form.category,
      subcategory: form.subcategory || defaultSubcategory,
      kind: "ingredient",
      trackStock: true,
      stockQuantity: Number.isFinite(parsedStockQuantity) ? parsedStockQuantity : 0,
      minStock: Number.isFinite(parsedMinStock) ? parsedMinStock : 0,
      stockUnit: form.stockUnit,
      usesPackage: form.stockUnit === "un" && form.usesPackage,
      packageSize: form.stockUnit === "un" && form.usesPackage ? parsedPackageSize : undefined,
      packageUnit: form.stockUnit === "un" && form.usesPackage ? form.packageUnit : undefined,
      preferredSupplierId: supplierId,
    };

    const result = await createProduct(input);
    if (!result.ok) {
      patchForm({ error: result.error ?? "Não foi possível cadastrar o produto." });
      return;
    }

    if (result.productId) {
      onCreated(result.productId);
    }

    handleDialogOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto rounded-3xl p-6 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">Cadastrar insumo</DialogTitle>
          <DialogDescription>
            Novo produto a partir da descrição da nota fiscal.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {supplierName ? (
            <div className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Fornecedor: </span>
              <span className="font-medium text-foreground">{supplierName}</span>
            </div>
          ) : null}

          <div className="space-y-2">
            <label htmlFor="product-create-name" className="text-sm font-medium">
              Nome
            </label>
            <Input
              id="product-create-name"
              value={form.name}
              onChange={(event) => patchForm({ name: event.target.value, error: "" })}
              className="h-11 rounded-xl px-3"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="product-create-category" className="text-sm font-medium">
                Categoria
              </label>
              <select
                id="product-create-category"
                value={form.category}
                onChange={(event) => {
                  const nextCategory = event.target.value;
                  patchForm({
                    category: nextCategory,
                    subcategory: getSubcategoryNames(categories, nextCategory)[0] ?? "",
                    error: "",
                  });
                }}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
              >
                {categories.map((entry) => (
                  <option key={entry.id} value={entry.name}>
                    {entry.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="product-create-subcategory" className="text-sm font-medium">
                Subcategoria
              </label>
              <select
                id="product-create-subcategory"
                value={form.subcategory}
                onChange={(event) => patchForm({ subcategory: event.target.value, error: "" })}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
              >
                {subcategoryOptions.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-border p-4">
            <div className="space-y-2">
              <label htmlFor="product-create-unit" className="text-sm font-medium">
                Unidade de estoque
              </label>
              <select
                id="product-create-unit"
                value={form.stockUnit}
                onChange={(event) => {
                  const nextUnit = event.target.value as StockUnit;
                  patchForm({
                    stockUnit: nextUnit,
                    usesPackage: nextUnit === "un" ? form.usesPackage : false,
                    error: "",
                  });
                }}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
              >
                {(Object.keys(STOCK_UNIT_LABELS) as StockUnit[]).map((unit) => (
                  <option key={unit} value={unit}>
                    {STOCK_UNIT_LABELS[unit]}
                  </option>
                ))}
              </select>
            </div>

            {form.stockUnit === "un" ? (
              <div className="space-y-3 rounded-xl border border-dashed border-border p-3">
                <label className="flex items-center gap-3 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={form.usesPackage}
                    onChange={(event) =>
                      patchForm({ usesPackage: event.target.checked, error: "" })
                    }
                    className="size-4 rounded border-border"
                  />
                  Comprado em embalagens (ex.: garrafa, caixa)
                </label>

                {form.usesPackage ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="package-size" className="text-sm font-medium">
                        Tamanho da embalagem
                      </label>
                      <Input
                        id="package-size"
                        type="number"
                        min={0.01}
                        step={0.01}
                        value={form.packageSize}
                        onChange={(event) => patchForm({ packageSize: event.target.value, error: "" })}
                        className="h-11 rounded-xl px-3"
                        placeholder="Ex.: 70"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="package-unit" className="text-sm font-medium">
                        Unidade da embalagem
                      </label>
                      <select
                        id="package-unit"
                        value={form.packageUnit}
                        onChange={(event) =>
                          patchForm({
                            packageUnit: event.target.value as StockUnit,
                            error: "",
                          })
                        }
                        className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                      >
                        <option value="ml">Mililitro (ml)</option>
                        <option value="cl">Centilitro (cl)</option>
                        <option value="L">Litro (L)</option>
                        <option value="g">Grama (g)</option>
                        <option value="kg">Quilograma (kg)</option>
                      </select>
                    </div>
                    <p className="sm:col-span-2 text-xs text-muted-foreground">
                      Ex.: garrafa de vinho do Porto com 70 cl — estoque em garrafas, ficha técnica
                      em cl por dose.
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}

            <p className="text-sm font-medium text-foreground">Controle de estoque</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="ingredient-stock" className="text-sm font-medium">
                  Estoque atual ({stockLabel})
                </label>
                <Input
                  id="ingredient-stock"
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.stockQuantity}
                  onChange={(event) => patchForm({ stockQuantity: event.target.value, error: "" })}
                  className="h-11 rounded-xl px-3"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="ingredient-min-stock" className="text-sm font-medium">
                  Estoque mínimo ({stockLabel})
                </label>
                <Input
                  id="ingredient-min-stock"
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.minStock}
                  onChange={(event) => patchForm({ minStock: event.target.value, error: "" })}
                  className="h-11 rounded-xl px-3"
                />
              </div>
            </div>
          </div>

          {form.error ? <p className="text-sm text-destructive">{form.error}</p> : null}

          <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => handleDialogOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="rounded-xl">
              <Plus className="size-4" />
              Cadastrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
