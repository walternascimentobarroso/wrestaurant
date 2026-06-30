from sqlalchemy import Boolean, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import ProductKind, StockUnit
from app.models.mixins import TimestampMixin


class Product(Base, TimestampMixin):
    __tablename__ = "products"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    price: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    category: Mapped[str] = mapped_column(String(255), nullable=False)
    subcategory: Mapped[str] = mapped_column(String(255), nullable=False)
    kind: Mapped[str] = mapped_column(String(32), nullable=False, default=ProductKind.MENU)
    track_stock: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    stock_quantity: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    min_stock: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    stock_unit: Mapped[str | None] = mapped_column(String(8))
    package_size: Mapped[float | None] = mapped_column(Float)
    package_unit: Mapped[str | None] = mapped_column(String(8))
    last_purchase_cost: Mapped[float | None] = mapped_column(Float)
    preferred_supplier_id: Mapped[str | None] = mapped_column(
        ForeignKey("suppliers.id", ondelete="SET NULL"),
    )

    recipe_lines: Mapped[list["RecipeLine"]] = relationship(
        back_populates="product",
        cascade="all, delete-orphan",
        foreign_keys="RecipeLine.product_id",
    )


class RecipeLine(Base):
    __tablename__ = "recipe_lines"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    product_id: Mapped[str] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
    )
    ingredient_id: Mapped[str] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
    )
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str | None] = mapped_column(String(8))

    product: Mapped[Product] = relationship(
        back_populates="recipe_lines",
        foreign_keys=[product_id],
    )
