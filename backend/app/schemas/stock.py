from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import StockMovementType


class StockMovementRead(BaseModel):
    id: str
    productId: str
    productName: str
    type: StockMovementType
    delta: float
    quantityAfter: float
    referenceId: str | None = None
    reason: str | None = None
    supplierId: str | None = None
    unitCost: float | None = None
    purchaseRecordId: str | None = None
    createdAt: datetime


class StockAdjustmentCreate(BaseModel):
    productId: str
    delta: float
    type: StockMovementType = StockMovementType.ADJUSTMENT
    reason: str = Field(min_length=1)
