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


class SalesSummaryRead(BaseModel):
    allTimeTotal: float
    allSalesCount: int
    dailyTotal: float
    dailySalesCount: int


class SalesByDayRead(BaseModel):
    dateKey: str
    total: float
    count: int
