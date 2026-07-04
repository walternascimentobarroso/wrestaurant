"use client";

import { useCallback } from "react";

import { getProductsSnapshot } from "@/features/menu/services/productStorage";

import { validateSaleInput } from "../services/saleService";
import {
  createSaleApi,
  deleteSaleApi,
  updateSaleApi,
} from "../services/salesStorage";
import type { SaleActionResult, SaleFormInput } from "../types";

export function useSaleAdmin() {
  const createSale = useCallback(
    async (input: SaleFormInput): Promise<SaleActionResult> => {
      const products = getProductsSnapshot();
      const validation = validateSaleInput(input, products);
      if (!validation.ok) {
        return validation;
      }

      try {
        await createSaleApi(input, products);
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Não foi possível criar a venda.",
        };
      }
    },
    [],
  );

  const updateSale = useCallback(
    async (id: string, input: SaleFormInput): Promise<SaleActionResult> => {
      const products = getProductsSnapshot();
      const validation = validateSaleInput(input, products);
      if (!validation.ok) {
        return validation;
      }

      try {
        await updateSaleApi(id, input, products);
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Não foi possível atualizar a venda.",
        };
      }
    },
    [],
  );

  const deleteSale = useCallback(
    async (id: string, reason: string): Promise<SaleActionResult> => {
      const normalizedReason = reason.trim();
      if (normalizedReason.length < 3) {
        return { ok: false, error: "Informe o motivo da exclusão (mínimo 3 caracteres)." };
      }

      try {
        await deleteSaleApi(id, normalizedReason);
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Não foi possível excluir a venda.",
        };
      }
    },
    [],
  );

  return {
    createSale,
    updateSale,
    deleteSale,
  };
}
