export interface InvoiceSupplierDraft {
  legalName: string;
  storeName?: string | null;
  taxId: string;
}

export interface InvoiceItemDraft {
  lineNumber: number;
  externalCode?: string | null;
  description: string;
  packType: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  vatCode?: string | null;
  weightKg?: number | null;
}

export interface InvoiceTotalsDraft {
  subtotalExVat?: number | null;
  totalIncVat: number;
  currency: string;
}

export interface InvoiceSkippedLineDraft {
  reason: string;
  raw: string;
}

export interface InvoiceDraft {
  template: string;
  documentId: string;
  invoiceNumber?: string | null;
  issueDate: string;
  supplier: InvoiceSupplierDraft;
  items: InvoiceItemDraft[];
  totals: InvoiceTotalsDraft;
  skippedLines: InvoiceSkippedLineDraft[];
}

export interface SupplierSuggestion {
  supplierId: string;
  supplierName: string;
  score: number;
  reason: string;
}

export interface ProductSuggestion {
  productId: string;
  productName: string;
  score: number;
  reason: string;
}

export interface ItemMappingSuggestion {
  lineNumber: number;
  draftItem: InvoiceItemDraft;
  suggestions: ProductSuggestion[];
  needsManualMapping: boolean;
  quantity: number;
  unitCost: number;
  packType: string;
}

export interface InvoiceSuggestResponse {
  supplierSuggestions: SupplierSuggestion[];
  itemMappings: ItemMappingSuggestion[];
}

export interface ItemMappingState {
  lineNumber: number;
  draftItem: InvoiceItemDraft;
  suggestions: ProductSuggestion[];
  selectedProductId: string | null;
  action: "map" | "create_new" | "skip";
  quantity: number;
  unitCost: number;
  vatRate: 0 | 6 | 23;
  packType: string;
  confirmed: boolean;
}

export type InvoiceImportStep = "upload" | "supplier" | "items" | "review";

export interface InvoiceImportWizardState {
  step: InvoiceImportStep;
  draft: InvoiceDraft | null;
  supplierSuggestions: SupplierSuggestion[];
  confirmedSupplierId: string | null;
  itemMappings: ItemMappingState[];
  purchasedAt: string;
  createPayable: boolean;
  notes: string;
}

export interface InvoiceImportProgress {
  confirmed: number;
  total: number;
  mappable: number;
}

export interface ConfirmedItemMapping {
  lineNumber: number;
  productId: string;
  quantity: number;
  unitCost: number;
  action: "map" | "create_new";
}

export interface InvoiceConfirmOptions {
  purchasedAt: string;
  notes?: string | null;
  createPayable?: boolean;
  payableCategoryId?: string | null;
  rawFileHash?: string | null;
}

export interface InvoiceConfirmRequest {
  draft: InvoiceDraft;
  confirmedSupplierId: string;
  itemMappings: ConfirmedItemMapping[];
  options: InvoiceConfirmOptions;
}

export interface InvoiceConfirmResult {
  invoiceImportId: string;
  purchaseIds: string[];
  payableId: string | null;
  itemsImported: number;
  itemsSkipped: number;
}

export interface InvoiceImportSummary {
  id: string;
  template: string;
  documentId: string;
  invoiceNumber: string | null;
  supplierId: string | null;
  supplierName: string | null;
  issueDate: string;
  totalIncVat: number | null;
  currency: string;
  status: string;
  itemCount: number;
  confirmedAt: string | null;
}

export interface InvoiceImportDetail extends InvoiceImportSummary {
  purchaseIds: string[];
  payableId: string | null;
  subtotalExVat: number | null;
}
