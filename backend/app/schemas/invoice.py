from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class InvoiceSupplierDraft(BaseModel):
    legalName: str
    storeName: str | None = None
    taxId: str


class InvoiceItemDraft(BaseModel):
    lineNumber: int
    externalCode: str | None = None
    description: str
    packType: str
    unitPrice: float
    quantity: float
    totalPrice: float
    vatCode: str | None = None
    weightKg: float | None = None


class InvoiceTotalsDraft(BaseModel):
    subtotalExVat: float | None = None
    totalIncVat: float
    currency: str = "EUR"


class InvoiceSkippedLineDraft(BaseModel):
    reason: str
    raw: str


class InvoiceDraft(BaseModel):
    template: str
    documentId: str
    invoiceNumber: str | None = None
    issueDate: datetime
    supplier: InvoiceSupplierDraft
    items: list[InvoiceItemDraft] = Field(default_factory=list)
    totals: InvoiceTotalsDraft
    skippedLines: list[InvoiceSkippedLineDraft] = Field(default_factory=list)


class SupplierSuggestion(BaseModel):
    supplierId: str
    supplierName: str
    score: float
    reason: str


class ProductSuggestion(BaseModel):
    productId: str
    productName: str
    score: float
    reason: str


class ItemMappingSuggestion(BaseModel):
    lineNumber: int
    draftItem: InvoiceItemDraft
    suggestions: list[ProductSuggestion]
    needsManualMapping: bool
    quantity: float
    unitCost: float
    packType: str


class InvoiceSuggestRequest(BaseModel):
    draft: InvoiceDraft
    confirmedSupplierId: str | None = None


class InvoiceSuggestResponse(BaseModel):
    supplierSuggestions: list[SupplierSuggestion]
    itemMappings: list[ItemMappingSuggestion]


class ConfirmedItemMapping(BaseModel):
    lineNumber: int
    productId: str
    quantity: float
    unitCost: float
    action: Literal["map", "create_new"]


class InvoiceConfirmOptions(BaseModel):
    purchasedAt: datetime
    notes: str | None = None
    createPayable: bool = False
    payableCategoryId: str | None = None
    rawFileHash: str | None = None


class InvoiceConfirmRequest(BaseModel):
    draft: InvoiceDraft
    confirmedSupplierId: str
    itemMappings: list[ConfirmedItemMapping]
    options: InvoiceConfirmOptions


class InvoiceConfirmResult(BaseModel):
    invoiceImportId: str
    purchaseIds: list[str]
    payableId: str | None
    itemsImported: int
    itemsSkipped: int


class InvoiceImportRead(BaseModel):
    id: str
    template: str
    documentId: str
    invoiceNumber: str | None
    supplierId: str | None
    supplierName: str | None
    issueDate: datetime
    totalIncVat: float | None
    currency: str
    status: str
    itemCount: int
    confirmedAt: datetime | None


class InvoiceImportDetailRead(InvoiceImportRead):
    purchaseIds: list[str]
    payableId: str | None
    subtotalExVat: float | None
