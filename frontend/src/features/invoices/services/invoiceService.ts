import { ApiError, apiFetch, getAuthToken } from "@/lib/api";

import type {
  InvoiceConfirmRequest,
  InvoiceConfirmResult,
  InvoiceDraft,
  InvoiceImportDetail,
  InvoiceImportSummary,
  InvoiceSuggestResponse,
} from "../types";

function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return "";
  }

  return (
    process.env.API_URL ??
    process.env.BACKEND_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:8000"
  );
}

async function parseApiError(response: Response): Promise<ApiError> {
  let detail = `HTTP ${response.status}`;
  try {
    const body = (await response.json()) as { detail?: string | { msg: string }[] };
    if (typeof body.detail === "string") {
      detail = body.detail;
    } else if (Array.isArray(body.detail) && body.detail[0]?.msg) {
      detail = body.detail[0].msg;
    }
  } catch {
    // keep default detail
  }
  return new ApiError(detail, response.status);
}

export async function parseInvoicePdf(file: File): Promise<InvoiceDraft> {
  const formData = new FormData();
  formData.append("file", file);

  const headers = new Headers();
  const token = getAuthToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}/api/invoices/parse`, {
      method: "POST",
      headers,
      body: formData,
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message === "Failed to fetch"
        ? "Não foi possível conectar à API. Verifique se o backend está rodando."
        : error instanceof Error
          ? error.message
          : "Erro de rede";
    throw new ApiError(message, 0);
  }

  if (!response.ok) {
    throw await parseApiError(response);
  }

  return response.json() as Promise<InvoiceDraft>;
}

export async function suggestMappings(
  draft: InvoiceDraft,
  confirmedSupplierId?: string,
): Promise<InvoiceSuggestResponse> {
  return apiFetch<InvoiceSuggestResponse>("/invoices/suggest", {
    method: "POST",
    body: JSON.stringify({
      draft,
      confirmedSupplierId: confirmedSupplierId ?? null,
    }),
  });
}

export async function confirmInvoice(
  payload: InvoiceConfirmRequest,
): Promise<InvoiceConfirmResult> {
  return apiFetch<InvoiceConfirmResult>("/invoices/confirm", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listInvoiceImports(): Promise<InvoiceImportSummary[]> {
  return apiFetch<InvoiceImportSummary[]>("/invoices");
}

export async function getInvoiceImport(importId: string): Promise<InvoiceImportDetail> {
  return apiFetch<InvoiceImportDetail>(`/invoices/${importId}`);
}
