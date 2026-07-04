from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import PaymentMethod


class SaleItemRead(BaseModel):
    productId: str
    productName: str
    quantity: int
    unitPrice: float
    subtotal: float


class SaleRead(BaseModel):
    id: str
    tableNumber: int
    openedAt: datetime | None = None
    paidAt: datetime
    paymentMethod: PaymentMethod
    amountReceived: float
    change: float
    total: float
    items: list[SaleItemRead]
    description: str
    source: str = "table"
    adjustmentReason: str | None = None


class SaleItemInput(BaseModel):
    productId: str
    quantity: int = Field(gt=0)


class SaleCreate(BaseModel):
    tableNumber: int = Field(gt=0)
    paidAt: datetime
    openedAt: datetime | None = None
    paymentMethod: PaymentMethod
    amountReceived: float = Field(ge=0)
    change: float = Field(ge=0, default=0)
    items: list[SaleItemInput] = Field(min_length=1)
    reason: str = Field(min_length=3)


class SaleUpdate(BaseModel):
    tableNumber: int | None = Field(default=None, gt=0)
    paidAt: datetime | None = None
    openedAt: datetime | None = None
    paymentMethod: PaymentMethod | None = None
    amountReceived: float | None = Field(default=None, ge=0)
    change: float | None = Field(default=None, ge=0)
    items: list[SaleItemInput] | None = None
    reason: str = Field(min_length=3)


class SalesSummaryRead(BaseModel):
    allTimeTotal: float
    allSalesCount: int
    dailyTotal: float
    dailySalesCount: int


class SalesByDayRead(BaseModel):
    dateKey: str
    total: float
    count: int
