from datetime import datetime

from pydantic import BaseModel, Field


class PurchaseRecordRead(BaseModel):
    id: str
    productId: str
    productName: str
    supplierId: str
    supplierName: str
    unitCost: float
    quantity: float
    totalCost: float
    purchasedAt: datetime
    notes: str | None = None
    stockMovementId: str | None = None


class PurchaseCreate(BaseModel):
    productId: str
    supplierId: str
    unitCost: float = Field(ge=0)
    quantity: float = Field(gt=0)
    purchasedAt: datetime
    notes: str | None = None


class PurchasePriceComparisonRead(BaseModel):
    previousUnitCost: float
    previousSupplierName: str
    difference: float
    percentChange: float
    isCheaper: bool


class ProductPurchaseInsightsRead(BaseModel):
    bestRecord: PurchaseRecordRead | None = None
    worstRecord: PurchaseRecordRead | None = None
    savingsVsWorst: float | None = None
    savingsPercentVsWorst: float | None = None
