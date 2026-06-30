from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db_session
from app.schemas.sync import SyncDeltaRead, SyncSnapshotRead
from app.services.sync_service import build_sync_delta, build_sync_snapshot

router = APIRouter(prefix="/sync", tags=["sync"])


@router.get("/snapshot", response_model=SyncSnapshotRead)
def sync_snapshot(db: Session = Depends(get_db_session)) -> SyncSnapshotRead:
    return build_sync_snapshot(db)


@router.get("/delta", response_model=SyncDeltaRead)
def sync_delta(
    since: datetime = Query(description="ISO8601 timestamp — records updated after this time"),
    db: Session = Depends(get_db_session),
) -> SyncDeltaRead:
    return build_sync_delta(db, since)
