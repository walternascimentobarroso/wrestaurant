from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import TimestampMixin


class ChecklistTemplate(Base, TimestampMixin):
    __tablename__ = "checklist_templates"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    type: Mapped[str] = mapped_column(String(16), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    time_window_start: Mapped[str] = mapped_column(String(8), nullable=False)
    time_window_end: Mapped[str] = mapped_column(String(8), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    items: Mapped[list["ChecklistItem"]] = relationship(
        back_populates="template",
        cascade="all, delete-orphan",
    )


class ChecklistItem(Base, TimestampMixin):
    __tablename__ = "checklist_items"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    template_id: Mapped[str] = mapped_column(
        ForeignKey("checklist_templates.id", ondelete="CASCADE"),
        nullable=False,
    )
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    days_of_week: Mapped[str | list] = mapped_column(JSON, nullable=False, default="all")
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    template: Mapped[ChecklistTemplate] = relationship(back_populates="items")
    completions: Mapped[list["ChecklistCompletion"]] = relationship(
        back_populates="item",
        cascade="all, delete-orphan",
    )


class ChecklistCompletion(Base, TimestampMixin):
    __tablename__ = "checklist_completions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    date_key: Mapped[str] = mapped_column(String(10), nullable=False)
    item_id: Mapped[str] = mapped_column(
        ForeignKey("checklist_items.id", ondelete="CASCADE"),
        nullable=False,
    )
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    item: Mapped[ChecklistItem] = relationship(back_populates="completions")
