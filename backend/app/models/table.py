from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import TableCategory, TableStatus
from app.models.mixins import TimestampMixin


class RestaurantTable(Base, TimestampMixin):
    __tablename__ = "restaurant_tables"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    category: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default=TableStatus.FREE)
    opened_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    order_items: Mapped[list["TableOrderItem"]] = relationship(
        back_populates="table",
        cascade="all, delete-orphan",
    )


class TableOrderItem(Base, TimestampMixin):
    __tablename__ = "table_order_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    table_id: Mapped[int] = mapped_column(
        ForeignKey("restaurant_tables.id", ondelete="CASCADE"),
        nullable=False,
    )
    product_id: Mapped[str] = mapped_column(
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    table: Mapped[RestaurantTable] = relationship(back_populates="order_items")
