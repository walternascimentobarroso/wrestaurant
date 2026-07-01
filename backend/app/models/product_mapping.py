from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.mixins import TimestampMixin


class ProductMapping(Base, TimestampMixin):
    __tablename__ = "product_mappings"
    __table_args__ = (
        Index("ix_product_mappings_supplier_code", "supplier_id", "external_code"),
        Index(
            "ix_product_mappings_supplier_description",
            "supplier_id",
            "external_description_normalized",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    supplier_id: Mapped[str] = mapped_column(
        ForeignKey("suppliers.id", ondelete="CASCADE"),
        nullable=False,
    )
    external_code: Mapped[str | None] = mapped_column(String(64))
    external_description_normalized: Mapped[str] = mapped_column(String(512), nullable=False)
    product_id: Mapped[str] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
    )
    unit_factor: Mapped[float | None] = mapped_column(Float)
    confirmed_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
