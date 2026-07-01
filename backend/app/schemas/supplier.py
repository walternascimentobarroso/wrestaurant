from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class SupplierRead(BaseModel):
    id: str
    name: str
    taxId: str | None = None
    tradeName: str | None = None
    legalName: str | None = None
    contactName: str | None = None
    email: str | None = None
    phone: str | None = None
    notes: str | None = None
    createdAt: datetime


class SupplierCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    taxId: str | None = None
    tradeName: str | None = None
    legalName: str | None = None
    contactName: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    notes: str | None = None


class SupplierUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    taxId: str | None = None
    tradeName: str | None = None
    legalName: str | None = None
    contactName: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    notes: str | None = None
