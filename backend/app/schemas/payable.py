from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models.enums import PayableRecurrence, PayableStatus


class PayableCategoryRead(BaseModel):
    id: str
    name: str

    model_config = {"from_attributes": True}


class PayableRead(BaseModel):
    id: str
    categoryId: str
    description: str
    supplierId: str | None = None
    amount: float
    dueDate: str
    recurrence: PayableRecurrence
    status: PayableStatus
    paidAt: datetime | None = None
    paidAmount: float | None = None
    notes: str | None = None
    createdAt: datetime


class PayableCreate(BaseModel):
    categoryId: str
    description: str = Field(min_length=1, max_length=500)
    supplierId: str | None = None
    amount: float = Field(gt=0)
    dueDate: date
    recurrence: PayableRecurrence = PayableRecurrence.NONE
    status: PayableStatus | None = None
    paidAt: datetime | None = None
    paidAmount: float | None = None
    notes: str | None = None


class PayableUpdate(BaseModel):
    categoryId: str | None = None
    description: str | None = Field(default=None, min_length=1, max_length=500)
    supplierId: str | None = None
    amount: float | None = Field(default=None, gt=0)
    dueDate: date | None = None
    recurrence: PayableRecurrence | None = None
    status: PayableStatus | None = None
    paidAt: datetime | None = None
    paidAmount: float | None = None
    notes: str | None = None


class MarkPaidRequest(BaseModel):
    paidAt: datetime
    paidAmount: float = Field(gt=0)


class PayableSummaryRead(BaseModel):
    dueSoonCount: int
    dueSoonTotal: float
    overdueCount: int
    overdueTotal: float
    paidThisMonthCount: int
    paidThisMonthTotal: float
    pendingThisMonthTotal: float
