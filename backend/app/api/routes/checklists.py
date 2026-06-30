import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_db_session
from app.models.checklist import ChecklistCompletion, ChecklistItem, ChecklistTemplate
from app.schemas.checklist import (
    ChecklistHistoryDayRead,
    ChecklistItemCreate,
    ChecklistItemRead,
    ChecklistItemUpdate,
    ChecklistTemplateRead,
    ChecklistTemplateUpdate,
    DailyChecklistRead,
    MoveItemRequest,
    ToggleCompletionRequest,
)
from app.services.checklist_service import build_history_days, get_daily_checklist
from app.services.mappers import checklist_item_to_read, checklist_template_to_read, utc_now

router = APIRouter(prefix="/checklists", tags=["checklists"])


@router.get("/daily", response_model=DailyChecklistRead)
def daily_checklist(
    date: str = Query(pattern=r"^\d{4}-\d{2}-\d{2}$"),
    db: Session = Depends(get_db_session),
) -> DailyChecklistRead:
    return get_daily_checklist(db, date)


@router.get("/history", response_model=list[ChecklistHistoryDayRead])
def checklist_history(db: Session = Depends(get_db_session)) -> list[ChecklistHistoryDayRead]:
    return build_history_days(db)


@router.post("/completions/toggle")
def toggle_completion(
    body: ToggleCompletionRequest,
    db: Session = Depends(get_db_session),
) -> dict[str, bool]:
    item = db.get(ChecklistItem, body.itemId)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item não encontrado.")

    existing = (
        db.query(ChecklistCompletion)
        .filter(
            ChecklistCompletion.date_key == body.dateKey,
            ChecklistCompletion.item_id == body.itemId,
        )
        .first()
    )

    if existing:
        db.delete(existing)
    else:
        db.add(
            ChecklistCompletion(
                id=f"completion-{uuid.uuid4()}",
                date_key=body.dateKey,
                item_id=body.itemId,
                completed_at=utc_now(),
            ),
        )

    db.commit()
    return {"ok": True}


@router.get("/templates", response_model=list[ChecklistTemplateRead])
def list_templates(
    db: Session = Depends(get_db_session),
    _admin: str = Depends(get_current_admin),
) -> list[ChecklistTemplateRead]:
    templates = db.query(ChecklistTemplate).order_by(ChecklistTemplate.sort_order).all()
    return [checklist_template_to_read(template) for template in templates]


@router.patch("/templates/{template_id}", response_model=ChecklistTemplateRead)
def update_template(
    template_id: str,
    body: ChecklistTemplateUpdate,
    db: Session = Depends(get_db_session),
    _admin: str = Depends(get_current_admin),
) -> ChecklistTemplateRead:
    template = db.get(ChecklistTemplate, template_id)
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Checklist não encontrada.")

    template.time_window_start = body.timeWindowStart.strip()
    template.time_window_end = body.timeWindowEnd.strip()
    template.active = body.active
    db.commit()
    db.refresh(template)
    return checklist_template_to_read(template)


@router.get("/items", response_model=list[ChecklistItemRead])
def list_items(
    templateId: str | None = Query(default=None),
    db: Session = Depends(get_db_session),
    _admin: str = Depends(get_current_admin),
) -> list[ChecklistItemRead]:
    query = db.query(ChecklistItem)
    if templateId:
        query = query.filter(ChecklistItem.template_id == templateId)
    items = query.order_by(ChecklistItem.sort_order).all()
    return [checklist_item_to_read(item) for item in items]


@router.post("/items", response_model=ChecklistItemRead, status_code=status.HTTP_201_CREATED)
def create_item(
    body: ChecklistItemCreate,
    db: Session = Depends(get_db_session),
    _admin: str = Depends(get_current_admin),
) -> ChecklistItemRead:
    template = db.get(ChecklistTemplate, body.templateId)
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Checklist não encontrada.")

    siblings = db.query(ChecklistItem).filter(ChecklistItem.template_id == body.templateId).all()
    max_sort = max((item.sort_order for item in siblings), default=-1)

    item = ChecklistItem(
        id=f"item-{uuid.uuid4()}",
        template_id=body.templateId,
        label=body.label.strip(),
        sort_order=body.sortOrder if body.sortOrder is not None else max_sort + 1,
        days_of_week=body.daysOfWeek,
        active=True,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return checklist_item_to_read(item)


@router.patch("/items/{item_id}", response_model=ChecklistItemRead)
def update_item(
    item_id: str,
    body: ChecklistItemUpdate,
    db: Session = Depends(get_db_session),
    _admin: str = Depends(get_current_admin),
) -> ChecklistItemRead:
    item = db.get(ChecklistItem, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item não encontrado.")

    item.label = body.label.strip()
    item.days_of_week = body.daysOfWeek
    item.active = body.active
    item.sort_order = body.sortOrder
    db.commit()
    db.refresh(item)
    return checklist_item_to_read(item)


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(
    item_id: str,
    db: Session = Depends(get_db_session),
    _admin: str = Depends(get_current_admin),
) -> None:
    item = db.get(ChecklistItem, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item não encontrado.")

    db.query(ChecklistCompletion).filter(ChecklistCompletion.item_id == item_id).delete()
    db.delete(item)
    db.commit()


@router.post("/items/{item_id}/move", response_model=ChecklistItemRead)
def move_item(
    item_id: str,
    body: MoveItemRequest,
    db: Session = Depends(get_db_session),
    _admin: str = Depends(get_current_admin),
) -> ChecklistItemRead:
    item = db.get(ChecklistItem, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item não encontrado.")

    siblings = (
        db.query(ChecklistItem)
        .filter(ChecklistItem.template_id == item.template_id)
        .order_by(ChecklistItem.sort_order)
        .all()
    )

    index = next((idx for idx, sibling in enumerate(siblings) if sibling.id == item_id), -1)
    target_index = index - 1 if body.direction == "up" else index + 1
    if target_index < 0 or target_index >= len(siblings):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não é possível mover o item nesta direção.",
        )

    target = siblings[target_index]
    item.sort_order, target.sort_order = target.sort_order, item.sort_order
    db.commit()
    db.refresh(item)
    return checklist_item_to_read(item)
