"use client";

import { useMemo } from "react";

import { SearchableSelect } from "@/components/SearchableSelect";
import type { Product } from "@/features/tables/types";

import type { ProductSuggestion } from "../types";

interface IngredientSearchSelectProps {
  ingredients: Product[];
  suggestions: ProductSuggestion[];
  value: string | null;
  onChange: (productId: string) => void;
  disabled?: boolean;
}

export function IngredientSearchSelect({
  ingredients,
  suggestions,
  value,
  onChange,
  disabled = false,
}: IngredientSearchSelectProps) {
  const options = useMemo(() => {
    const ingredientById = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));
    const suggestionIds = new Set<string>();

    const suggestionOptions = suggestions
      .map((suggestion) => {
        const ingredient = ingredientById.get(suggestion.productId);
        suggestionIds.add(suggestion.productId);
        return {
          id: suggestion.productId,
          label: ingredient?.name ?? suggestion.productName,
          hint: `Sugestão ${Math.round(suggestion.score)}% — ${suggestion.reason}`,
          isSuggestion: true,
        };
      })
      .filter(
        (option, index, list) => list.findIndex((entry) => entry.id === option.id) === index,
      );

    const allOptions = ingredients
      .filter((ingredient) => !suggestionIds.has(ingredient.id))
      .map((ingredient) => ({
        id: ingredient.id,
        label: ingredient.name,
        hint: ingredient.subcategory
          ? `${ingredient.category} / ${ingredient.subcategory}`
          : undefined,
        isSuggestion: false,
      }))
      .sort((left, right) => left.label.localeCompare(right.label, "pt-PT"));

    const merged = [...suggestionOptions, ...allOptions];

    if (value && !merged.some((option) => option.id === value)) {
      const selected = ingredientById.get(value);
      if (selected) {
        merged.unshift({
          id: selected.id,
          label: selected.name,
          hint: "Selecionado",
          isSuggestion: false,
        });
      }
    }

    return merged;
  }, [ingredients, suggestions, value]);

  return (
    <SearchableSelect
      options={options}
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder="Buscar insumo…"
      emptyMessage={
        ingredients.length === 0
          ? "Nenhum insumo carregado. Cadastre um novo ou aguarde a sincronização."
          : "Nenhum insumo encontrado."
      }
    />
  );
}
