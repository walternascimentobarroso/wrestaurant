from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_db_session
from app.models.settings import AppSettings
from app.schemas.settings import AppSettingsRead, AppSettingsUpdate
from app.services.mappers import settings_to_read

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=AppSettingsRead)
def get_settings(db: Session = Depends(get_db_session)) -> AppSettingsRead:
    settings = db.get(AppSettings, "default")
    if not settings:
        settings = AppSettings(id="default", currency="EUR")
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings_to_read(settings)


@router.patch("", response_model=AppSettingsRead)
def update_settings(
    body: AppSettingsUpdate,
    db: Session = Depends(get_db_session),
    _admin: str = Depends(get_current_admin),
) -> AppSettingsRead:
    settings = db.get(AppSettings, "default")
    if not settings:
        settings = AppSettings(id="default", currency=body.currency)
        db.add(settings)
    else:
        settings.currency = body.currency
    db.commit()
    db.refresh(settings)
    return settings_to_read(settings)
