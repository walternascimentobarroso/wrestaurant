"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getDefaultRecipeUnit,
  RECIPE_UNITS,
  STOCK_UNIT_LABELS,
} from "@/features/stock/utils/stockUnits";
import type { Product, RecipeLine, StockUnit } from "@/features/tables/types";
import { cn } from "@/lib/utils";

interface RecipeEditorProps {
  recipe: RecipeLine[];
  ingredients: Product[];
  onChange: (recipe: RecipeLine[]) => void;
  className?: string;
}

const EMPTY_LINE: RecipeLine = { ingredientId: "", quantity: 1, unit: "cl" };

export function RecipeEditor({
  recipe,
  ingredients,
  onChange,
  className,
}: RecipeEditorProps) {
  function updateLine(index: number, patch: Partial<RecipeLine>) {
    onChange(
      recipe.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...patch } : line,
      ),
    );
  }

  function removeLine(index: number) {
    onChange(recipe.filter((_, lineIndex) => lineIndex !== index));
  }

  function addLine() {
    onChange([...recipe, { ...EMPTY_LINE }]);
  }

  function handleIngredientChange(index: number, ingredientId: string) {
    const ingredient = ingredients.find((entry) => entry.id === ingredientId);
    const unit = ingredient ? getDefaultRecipeUnit(ingredient) : "un";
    updateLine(index, { ingredientId, unit });
  }

  if (ingredients.length === 0) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground",
          className,
        )}
      >
        Cadastre insumos antes de montar a ficha técnica.
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {recipe.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum insumo adicionado. Clique em adicionar insumo.
        </p>
      ) : (
        recipe.map((line, index) => (
          <div key={`recipe-line-${index}`} className="flex items-end gap-2">
            <div className="min-w-0 flex-1 space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Insumo</label>
              <select
                value={line.ingredientId}
                onChange={(event) => handleIngredientChange(index, event.target.value)}
                className="h-11 w-full rounded-xl border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">Selecione…</option>
                {ingredients.map((ingredient) => (
                  <option key={ingredient.id} value={ingredient.id}>
                    {ingredient.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-24 space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Qtd.</label>
              <Input
                type="number"
                min={0.01}
                step={0.01}
                value={line.quantity}
                onChange={(event) => {
                  const quantity = Number.parseFloat(event.target.value.replace(",", "."));
                  updateLine(index, { quantity });
                }}
                className="h-11 rounded-xl px-3"
              />
            </div>

            <div className="w-28 space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Unidade</label>
              <select
                value={line.unit ?? "un"}
                onChange={(event) =>
                  updateLine(index, { unit: event.target.value as StockUnit })
                }
                className="h-11 w-full rounded-xl border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {RECIPE_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {STOCK_UNIT_LABELS[unit]}
                  </option>
                ))}
              </select>
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="mb-0.5 rounded-lg text-destructive hover:text-destructive"
              aria-label="Remover insumo"
              onClick={() => removeLine(index)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))
      )}

      <Button type="button" variant="outline" className="rounded-xl" onClick={addLine}>
        <Plus className="size-4" />
        Adicionar insumo
      </Button>
    </div>
  );
}
