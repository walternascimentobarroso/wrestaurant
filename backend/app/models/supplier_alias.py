from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.mixins import TimestampMixin


class SupplierAlias(Base, TimestampMixin):
    __tablename__ = "supplier_aliases"
    __table_args__ = (
        Index("ix_supplier_aliases_source_tax_id", "source_tax_id"),
        Index(
            "ix_supplier_aliases_name_store",
            "source_name_normalized",
            "source_store_name",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    supplier_id: Mapped[str] = mapped_column(
        ForeignKey("suppliers.id", ondelete="CASCADE"),
        nullable=False,
    )
    source_tax_id: Mapped[str | None] = mapped_column(String(32))
    source_name_normalized: Mapped[str] = mapped_column(String(255), nullable=False)
    source_store_name: Mapped[str | None] = mapped_column(String(255))
    confirmed_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
