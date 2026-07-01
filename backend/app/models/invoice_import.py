from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Index, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.mixins import TimestampMixin


class InvoiceImport(Base, TimestampMixin):
    __tablename__ = "invoice_imports"
    __table_args__ = (Index("ix_invoice_imports_document_id", "document_id", unique=True),)

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    template: Mapped[str] = mapped_column(String(64), nullable=False)
    document_id: Mapped[str] = mapped_column(String(128), nullable=False)
    invoice_number: Mapped[str | None] = mapped_column(String(128))
    supplier_id: Mapped[str | None] = mapped_column(
        ForeignKey("suppliers.id", ondelete="SET NULL"),
    )
    issue_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    subtotal_ex_vat: Mapped[float | None] = mapped_column(Float)
    total_inc_vat: Mapped[float | None] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="EUR")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft")
    raw_file_hash: Mapped[str | None] = mapped_column(String(64))
    item_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    purchase_ids: Mapped[list[str] | None] = mapped_column(JSON)
    payable_id: Mapped[str | None] = mapped_column(
        ForeignKey("payables.id", ondelete="SET NULL"),
    )
