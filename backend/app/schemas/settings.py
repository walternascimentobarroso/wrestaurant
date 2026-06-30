from app.models.enums import CurrencyCode
from pydantic import BaseModel


class AppSettingsRead(BaseModel):
    currency: CurrencyCode

    model_config = {"from_attributes": True}


class AppSettingsUpdate(BaseModel):
    currency: CurrencyCode
