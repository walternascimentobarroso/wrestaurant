"use client";

import { useCallback, useEffect, useReducer, useState } from "react";

import { ApiError } from "@/lib/api";
import { replaceProductsFromServer } from "@/features/menu/services/productStorage";
import type { Product } from "@/features/menu/types";
import { replacePurchasesFromServer } from "@/features/purchases/services/purchaseStorage";
import type { PurchaseRecord } from "@/features/purchases/types";
import { hydrateFromServer } from "@/features/sync";
import { apiFetch } from "@/lib/api";

import { confirmInvoice, parseInvoicePdf, suggestMappings } from "../services/invoiceService";
import type {
  InvoiceConfirmResult,
  InvoiceDraft,
  InvoiceImportProgress,
  InvoiceImportWizardState,
  ItemMappingState,
  ItemMappingSuggestion,
} from "../types";

const SESSION_STORAGE_KEY = "invoice-import-wizard-draft";

const INITIAL_STATE: InvoiceImportWizardState = {
  step: "upload",
  draft: null,
  supplierSuggestions: [],
  confirmedSupplierId: null,
  itemMappings: [],
  purchasedAt: "",
  createPayable: false,
  notes: "",
};

type InvoiceImportAction =
  | { type: "RESTORE"; state: InvoiceImportWizardState }
  | { type: "SET_LOADING_SUGGESTIONS" }
  | {
      type: "PARSE_SUCCESS";
      draft: InvoiceDraft;
      supplierSuggestions: InvoiceImportWizardState["supplierSuggestions"];
      purchasedAt: string;
      notes: string;
    }
  | {
      type: "SUPPLIER_CONFIRMED";
      supplierId: string;
      itemMappings: ItemMappingState[];
    }
  | { type: "SET_STEP"; step: InvoiceImportWizardState["step"] }
  | { type: "SET_PURCHASED_AT"; purchasedAt: string }
  | { type: "SET_NOTES"; notes: string }
  | { type: "SET_CREATE_PAYABLE"; createPayable: boolean }
  | {
      type: "UPDATE_ITEM_MAPPING";
      lineNumber: number;
      patch: Partial<ItemMappingState>;
    }
  | { type: "CONFIRM_ALL_HIGH_CONFIDENCE"; threshold: number }
  | { type: "RESET" };

function toDateInput(isoDate: string): string {
  return isoDate.slice(0, 10);
}

function buildDefaultNotes(draft: InvoiceDraft): string {
  const parts = [draft.invoiceNumber, `ATCUD ${draft.documentId}`].filter(Boolean);
  return parts.join(" — ");
}

function mapItemMappings(suggestions: ItemMappingSuggestion[]): ItemMappingState[] {
  return suggestions.map((mapping) => ({
    lineNumber: mapping.lineNumber,
    draftItem: mapping.draftItem,
    suggestions: mapping.suggestions,
    selectedProductId: mapping.suggestions[0]?.productId ?? null,
    action: "map",
    quantity: mapping.quantity,
    unitCost: mapping.unitCost,
    packType: mapping.packType,
    confirmed: false,
  }));
}

function invoiceImportReducer(
  state: InvoiceImportWizardState,
  action: InvoiceImportAction,
): InvoiceImportWizardState {
  switch (action.type) {
    case "RESTORE":
      return action.state;
    case "SET_LOADING_SUGGESTIONS":
      return state;
    case "PARSE_SUCCESS":
      return {
        ...state,
        step: "supplier",
        draft: action.draft,
        supplierSuggestions: action.supplierSuggestions,
        confirmedSupplierId: null,
        itemMappings: [],
        purchasedAt: action.purchasedAt,
        notes: action.notes,
      };
    case "SUPPLIER_CONFIRMED":
      return {
        ...state,
        step: "items",
        confirmedSupplierId: action.supplierId,
        itemMappings: action.itemMappings,
      };
    case "SET_STEP":
      return { ...state, step: action.step };
    case "SET_PURCHASED_AT":
      return { ...state, purchasedAt: action.purchasedAt };
    case "SET_NOTES":
      return { ...state, notes: action.notes };
    case "SET_CREATE_PAYABLE":
      return { ...state, createPayable: action.createPayable };
    case "UPDATE_ITEM_MAPPING":
      return {
        ...state,
        itemMappings: state.itemMappings.map((mapping) =>
          mapping.lineNumber === action.lineNumber
            ? { ...mapping, ...action.patch }
            : mapping,
        ),
      };
    case "CONFIRM_ALL_HIGH_CONFIDENCE":
      return {
        ...state,
        itemMappings: state.itemMappings.map((mapping) => {
          if (mapping.action === "skip" || mapping.confirmed) {
            return mapping;
          }

          const topSuggestion = mapping.suggestions[0];
          if (!topSuggestion || topSuggestion.score < action.threshold) {
            return mapping;
          }

          return {
            ...mapping,
            selectedProductId: topSuggestion.productId,
            action: "map",
            confirmed: true,
          };
        }),
      };
    case "RESET":
      return INITIAL_STATE;
    default:
      return state;
  }
}

function loadPersistedState(): InvoiceImportWizardState | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as InvoiceImportWizardState;
    if (!parsed || typeof parsed !== "object" || !parsed.step) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function persistState(state: InvoiceImportWizardState): void {
  if (typeof window === "undefined") {
    return;
  }

  if (!state.draft) {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(state));
}

export function useInvoiceImport() {
  const [state, dispatch] = useReducer(invoiceImportReducer, INITIAL_STATE);

  useEffect(() => {
    const persisted = loadPersistedState();
    if (persisted?.draft) {
      dispatch({ type: "RESTORE", state: persisted });
    }
  }, []);

  useEffect(() => {
    persistState(state);
  }, [state]);

  const uploadAndParse = useCallback(async (file: File) => {
    const draft = await parseInvoicePdf(file);
    const suggestResponse = await suggestMappings(draft);

    dispatch({
      type: "PARSE_SUCCESS",
      draft,
      supplierSuggestions: suggestResponse.supplierSuggestions,
      purchasedAt: toDateInput(draft.issueDate),
      notes: buildDefaultNotes(draft),
    });

    return draft;
  }, []);

  const confirmSupplier = useCallback(
    async (supplierId: string) => {
      if (!state.draft) {
        throw new Error("Nenhuma fatura carregada.");
      }

      const suggestResponse = await suggestMappings(state.draft, supplierId);

      dispatch({
        type: "SUPPLIER_CONFIRMED",
        supplierId,
        itemMappings: mapItemMappings(suggestResponse.itemMappings),
      });
    },
    [state.draft],
  );

  const selectProduct = useCallback((lineNumber: number, productId: string) => {
    dispatch({
      type: "UPDATE_ITEM_MAPPING",
      lineNumber,
      patch: {
        selectedProductId: productId,
        action: "map",
        confirmed: false,
      },
    });
  }, []);

  const skipItem = useCallback((lineNumber: number) => {
    dispatch({
      type: "UPDATE_ITEM_MAPPING",
      lineNumber,
      patch: {
        action: "skip",
        confirmed: false,
        selectedProductId: null,
      },
    });
  }, []);

  const confirmItem = useCallback((lineNumber: number) => {
    dispatch({
      type: "UPDATE_ITEM_MAPPING",
      lineNumber,
      patch: {
        action: "map",
        confirmed: true,
      },
    });
  }, []);

  const updateItemQuantity = useCallback((lineNumber: number, quantity: number) => {
    dispatch({
      type: "UPDATE_ITEM_MAPPING",
      lineNumber,
      patch: { quantity, confirmed: false },
    });
  }, []);

  const updateItemUnitCost = useCallback((lineNumber: number, unitCost: number) => {
    dispatch({
      type: "UPDATE_ITEM_MAPPING",
      lineNumber,
      patch: { unitCost, confirmed: false },
    });
  }, []);

  const confirmAllHighConfidence = useCallback((threshold = 90) => {
    dispatch({ type: "CONFIRM_ALL_HIGH_CONFIDENCE", threshold });
  }, []);

  const getProgress = useCallback((): InvoiceImportProgress => {
    const total = state.itemMappings.length;
    const mappable = state.itemMappings.filter((mapping) => mapping.action !== "skip").length;
    const confirmed = state.itemMappings.filter(
      (mapping) => mapping.confirmed && mapping.action === "map",
    ).length;

    return { confirmed, total, mappable };
  }, [state.itemMappings]);

  const goToStep = useCallback((step: InvoiceImportWizardState["step"]) => {
    dispatch({ type: "SET_STEP", step });
  }, []);

  const setPurchasedAt = useCallback((purchasedAt: string) => {
    dispatch({ type: "SET_PURCHASED_AT", purchasedAt });
  }, []);

  const setNotes = useCallback((notes: string) => {
    dispatch({ type: "SET_NOTES", notes });
  }, []);

  const setCreatePayable = useCallback((createPayable: boolean) => {
    dispatch({ type: "SET_CREATE_PAYABLE", createPayable });
  }, []);

  const resetWizard = useCallback(() => {
    dispatch({ type: "RESET" });
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }, []);

  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const confirmImport = useCallback(async (): Promise<InvoiceConfirmResult> => {
    if (!state.draft || !state.confirmedSupplierId) {
      throw new Error("Dados incompletos para confirmar a importação.");
    }

    const itemMappings = state.itemMappings
      .filter((mapping) => mapping.confirmed && mapping.action === "map" && mapping.selectedProductId)
      .map((mapping) => ({
        lineNumber: mapping.lineNumber,
        productId: mapping.selectedProductId as string,
        quantity: mapping.quantity,
        unitCost: mapping.unitCost,
        action: mapping.action === "create_new" ? ("create_new" as const) : ("map" as const),
      }));

    if (itemMappings.length === 0) {
      throw new Error("Confirme pelo menos um item antes de importar.");
    }

    const purchasedAt = state.purchasedAt
      ? new Date(`${state.purchasedAt}T12:00:00`).toISOString()
      : new Date().toISOString();

    setIsConfirming(true);
    setConfirmError(null);

    try {
      const result = await confirmInvoice({
        draft: state.draft,
        confirmedSupplierId: state.confirmedSupplierId,
        itemMappings,
        options: {
          purchasedAt,
          notes: state.notes || null,
          createPayable: state.createPayable,
          payableCategoryId: state.createPayable ? "suppliers" : null,
        },
      });

      await Promise.all([
        hydrateFromServer(
          "purchases",
          async () => {
            const records = await apiFetch<PurchaseRecord[]>("/purchases");
            replacePurchasesFromServer(records);
          },
          { force: true },
        ),
        hydrateFromServer(
          "products",
          async () => {
            const products = await apiFetch<Product[]>("/products");
            replaceProductsFromServer(products);
          },
          { force: true },
        ),
      ]);

      resetWizard();
      return result;
    } catch (error) {
      const message = getInvoiceConfirmErrorMessage(error);
      setConfirmError(message);
      throw error;
    } finally {
      setIsConfirming(false);
    }
  }, [
    resetWizard,
    state.confirmedSupplierId,
    state.createPayable,
    state.draft,
    state.itemMappings,
    state.notes,
    state.purchasedAt,
  ]);

  return {
    state,
    uploadAndParse,
    confirmSupplier,
    selectProduct,
    skipItem,
    confirmItem,
    updateItemQuantity,
    updateItemUnitCost,
    confirmAllHighConfidence,
    getProgress,
    goToStep,
    setPurchasedAt,
    setNotes,
    setCreatePayable,
    resetWizard,
    confirmImport,
    isConfirming,
    confirmError,
  };
}

export function getInvoiceUploadErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409) {
      return "Esta fatura já foi importada.";
    }

    if (error.status === 422) {
      return "Formato não reconhecido.";
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Não foi possível processar o ficheiro.";
}

export function getInvoiceConfirmErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409) {
      return "Esta fatura já foi importada anteriormente.";
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Não foi possível confirmar a importação.";
}
