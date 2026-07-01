"use client";

import { useMemo } from "react";

import { SearchableSelect } from "@/components/SearchableSelect";
import type { Supplier } from "@/features/suppliers/types";

import type { SupplierSuggestion } from "../types";

interface SupplierSearchSelectProps {
  suppliers: Supplier[];
  suggestions: SupplierSuggestion[];
  value: string | null;
  onChange: (supplierId: string) => void;
  disabled?: boolean;
}

export function SupplierSearchSelect({
  suppliers,
  suggestions,
  value,
  onChange,
  disabled = false,
}: SupplierSearchSelectProps) {
  const options = useMemo(() => {
    const supplierById = new Map(suppliers.map((supplier) => [supplier.id, supplier]));
    const suggestionIds = new Set<string>();

    const suggestionOptions = suggestions
      .map((suggestion) => {
        const supplier = supplierById.get(suggestion.supplierId);
        if (!supplier) {
          return null;
        }

        suggestionIds.add(supplier.id);
        return {
          id: supplier.id,
          label: supplier.name,
          hint: `Sugestão ${Math.round(suggestion.score)}% — ${suggestion.reason}`,
          isSuggestion: true,
        };
      })
      .filter((option): option is NonNullable<typeof option> => option !== null);

    const allOptions = suppliers
      .filter((supplier) => !suggestionIds.has(supplier.id))
      .map((supplier) => ({
        id: supplier.id,
        label: supplier.name,
        hint: supplier.taxId ? `NIF ${supplier.taxId}` : undefined,
        isSuggestion: false,
      }))
      .sort((left, right) => left.label.localeCompare(right.label, "pt-PT"));

    return [...suggestionOptions, ...allOptions];
  }, [suppliers, suggestions]);

  return (
    <SearchableSelect
      options={options}
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder="Buscar fornecedor…"
      emptyMessage={
        suppliers.length === 0
          ? "Nenhum fornecedor carregado. Cadastre um novo ou aguarde a sincronização."
          : "Nenhum fornecedor encontrado."
      }
    />
  );
}
