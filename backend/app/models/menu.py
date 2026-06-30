from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import TimestampMixin


class MenuCategory(Base, TimestampMixin):
    __tablename__ = "menu_categories"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)

    subcategories: Mapped[list["MenuSubcategory"]] = relationship(
        back_populates="category",
        cascade="all, delete-orphan",
    )


class MenuSubcategory(Base, TimestampMixin):
    __tablename__ = "menu_subcategories"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    category_id: Mapped[str] = mapped_column(
        ForeignKey("menu_categories.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)

    category: Mapped[MenuCategory] = relationship(back_populates="subcategories")
