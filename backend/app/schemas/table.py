from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import PaymentMethod, TableCategory, TableStatus


class TableOrderItemRead(BaseModel):
    productId: str
    quantity: int


class TableRead(BaseModel):
    id: int
    number: int
    category: TableCategory
    status: TableStatus
    items: list[TableOrderItemRead]
    openedAt: datetime | None = None


class TableWithDetailsRead(TableRead):
    total: float
    itemCount: int


class TableCreate(BaseModel):
    number: int = Field(gt=0)
    category: TableCategory


class TableUpdate(BaseModel):
    number: int | None = Field(default=None, gt=0)
    category: TableCategory | None = None


class AddTableItemRequest(BaseModel):
    productId: str


class PaymentRequest(BaseModel):
    method: PaymentMethod
    amountReceived: float = Field(ge=0)
    change: float = Field(default=0, ge=0)
