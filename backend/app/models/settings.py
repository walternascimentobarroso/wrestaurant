from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.enums import CurrencyCode
from app.models.mixins import TimestampMixin


class AppSettings(Base, TimestampMixin):
    __tablename__ = "app_settings"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default="default")
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default=CurrencyCode.EUR)
