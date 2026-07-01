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
import {
  getSubcategoryNames,
} from "@/features/menu/services/menuCatalogStorage";
import { useMenuCatalog } from "@/features/menu/hooks/useMenuCatalog";
import { useProductAdmin, type ProductInput } from "@/features/menu/hooks/useProductAdmin";
import { getProductsSnapshot } from "@/features/menu/services/productStorage";
import { STOCK_UNIT_LABELS } from "@/features/stock/utils/stockUnits";
import type { StockUnit } from "@/features/tables/types";

import { packTypeToStockUnit } from "../utils/packType";

interface ProductQuickCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultName: string;
  packType: string;
  onCreated: (productId: string) => void;
}

export function ProductQuickCreateDialog({
  open,
  onOpenChange,
  defaultName,
  packType,
  onCreated,
}: ProductQuickCreateDialogProps) {
  const { categories } = useMenuCatalog();
  const { createProduct } = useProductAdmin();

  const defaultCategory = categories[0]?.name ?? "";
  const defaultSubcategory = getSubcategoryNames(categories, defaultCategory)[0] ?? "";
  const defaultStockUnit = packTypeToStockUnit(packType);

  const [name, setName] = useState(defaultName);
  const [category, setCategory] = useState(defaultCategory);
  const [subcategory, setSubcategory] = useState(defaultSubcategory);
  const [stockUnit, setStockUnit] = useState<StockUnit>(defaultStockUnit);
  const [error, setError] = useState("");

  const subcategoryOptions = useMemo(
    () => getSubcategoryNames(categories, category),
    [categories, category],
  );

  function resetForm() {
    setName(defaultName);
    setCategory(defaultCategory);
    setSubcategory(defaultSubcategory);
    setStockUnit(defaultStockUnit);
    setError("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const input: ProductInput = {
      name: name.trim(),
      price: 0,
      category,
      subcategory: subcategory || defaultSubcategory,
      kind: "ingredient",
      trackStock: true,
      stockQuantity: 0,
      minStock: 0,
      stockUnit,
      usesPackage: false,
    };

    const result = await createProduct(input);
    if (!result.ok) {
      setError(result.error ?? "Não foi possível cadastrar o produto.");
      return;
    }

    const created = getProductsSnapshot().find((product) => product.name === input.name);
    if (created) {
      onCreated(created.id);
    }

    onOpenChange(false);
    resetForm();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          resetForm();
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-w-md rounded-3xl p-6 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Cadastrar insumo</DialogTitle>
          <DialogDescription>
            Novo produto a partir da descrição da nota fiscal.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="product-create-name" className="text-sm font-medium">
              Nome
            </label>
            <Input
              id="product-create-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
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
                value={category}
                onChange={(event) => {
                  const nextCategory = event.target.value;
                  setCategory(nextCategory);
                  setSubcategory(getSubcategoryNames(categories, nextCategory)[0] ?? "");
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
                value={subcategory}
                onChange={(event) => setSubcategory(event.target.value)}
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

          <div className="space-y-2">
            <label htmlFor="product-create-unit" className="text-sm font-medium">
              Unidade de estoque
            </label>
            <select
              id="product-create-unit"
              value={stockUnit}
              onChange={(event) => setStockUnit(event.target.value as StockUnit)}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
            >
              {(Object.keys(STOCK_UNIT_LABELS) as StockUnit[]).map((unit) => (
                <option key={unit} value={unit}>
                  {STOCK_UNIT_LABELS[unit]}
                </option>
              ))}
            </select>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
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
