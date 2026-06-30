from datetime import date, datetime

from pydantic import BaseModel, EmailStr, Field

from app.models.enums import PayableRecurrence, PayableStatus


class SupplierRead(BaseModel):
    id: str
    name: str
    contactName: str | None = None
    email: str | None = None
    phone: str | None = None
    notes: str | None = None
    createdAt: datetime


class SupplierCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    contactName: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    notes: str | None = None


class SupplierUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    contactName: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    notes: str | None = None
