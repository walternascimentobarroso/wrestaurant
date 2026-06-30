from datetime import date, datetime

from sqlalchemy.orm import Session

from app.models.checklist import ChecklistCompletion, ChecklistItem, ChecklistTemplate
from app.schemas.checklist import (
    ChecklistHistoryDayRead,
    ChecklistProgressRead,
    DailyChecklistRead,
    ResolvedChecklistItemRead,
)
from app.services.mappers import checklist_item_to_read, utc_now


def item_applies_on_day(days_of_week: str | list, day_of_week: int) -> bool:
    if days_of_week == "all" or days_of_week is None:
        return True
    return day_of_week in days_of_week


def is_day_specific_item(days_of_week: str | list) -> bool:
    return days_of_week != "all" and days_of_week is not None


def resolve_daily_items(
    items: list[ChecklistItem],
    completions: list[ChecklistCompletion],
    template_id: str,
    date_key: str,
    day_of_week: int,
) -> list[ResolvedChecklistItemRead]:
    day_items = [
        item
        for item in items
        if item.template_id == template_id
        and item.active
        and item_applies_on_day(item.days_of_week, day_of_week)
    ]
    day_items.sort(key=lambda item: item.sort_order)

    completion_map = {
        completion.item_id: completion
        for completion in completions
        if completion.date_key == date_key
    }

    resolved: list[ResolvedChecklistItemRead] = []
    for item in day_items:
        completion = completion_map.get(item.id)
        resolved.append(
            ResolvedChecklistItemRead(
                item=checklist_item_to_read(item),
                completed=completion is not None,
                completedAt=completion.completed_at if completion else None,
                isDaySpecific=is_day_specific_item(item.days_of_week),
            ),
        )
    return resolved


def compute_progress(items: list[ResolvedChecklistItemRead]) -> ChecklistProgressRead:
    total = len(items)
    completed = sum(1 for entry in items if entry.completed)
    return ChecklistProgressRead(
        completed=completed,
        total=total,
        isComplete=total > 0 and completed == total,
    )


def get_daily_checklist(
    db: Session,
    date_key: str,
) -> DailyChecklistRead:
    parsed = datetime.strptime(date_key, "%Y-%m-%d")
    day_of_week = parsed.weekday()
    # Python weekday: Mon=0, frontend uses Sun=0
    day_of_week = (parsed.weekday() + 1) % 7

    templates = db.query(ChecklistTemplate).filter(ChecklistTemplate.active.is_(True)).all()
    items = db.query(ChecklistItem).all()
    completions = db.query(ChecklistCompletion).filter(ChecklistCompletion.date_key == date_key).all()

    opening_template = next((template for template in templates if template.type == "opening"), None)
    closing_template = next((template for template in templates if template.type == "closing"), None)

    opening_items = (
        resolve_daily_items(items, completions, opening_template.id, date_key, day_of_week)
        if opening_template
        else []
    )
    closing_items = (
        resolve_daily_items(items, completions, closing_template.id, date_key, day_of_week)
        if closing_template
        else []
    )

    return DailyChecklistRead(
        dateKey=date_key,
        opening=opening_items,
        closing=closing_items,
        openingProgress=compute_progress(opening_items),
        closingProgress=compute_progress(closing_items),
    )


def build_history_days(db: Session) -> list[ChecklistHistoryDayRead]:
    completions = db.query(ChecklistCompletion).all()
    items = db.query(ChecklistItem).all()
    templates = db.query(ChecklistTemplate).all()

    date_keys = {completion.date_key for completion in completions}
    date_keys.add(utc_now().strftime("%Y-%m-%d"))

    opening_template = next((template for template in templates if template.type == "opening"), None)
    closing_template = next((template for template in templates if template.type == "closing"), None)

    history: list[ChecklistHistoryDayRead] = []
    for date_key in sorted(date_keys, reverse=True):
        parsed = datetime.strptime(date_key, "%Y-%m-%d")
        day_of_week = (parsed.weekday() + 1) % 7

        opening_items = (
            resolve_daily_items(items, completions, opening_template.id, date_key, day_of_week)
            if opening_template
            else []
        )
        closing_items = (
            resolve_daily_items(items, completions, closing_template.id, date_key, day_of_week)
            if closing_template
            else []
        )

        history.append(
            ChecklistHistoryDayRead(
                dateKey=date_key,
                opening=compute_progress(opening_items),
                closing=compute_progress(closing_items),
            ),
        )

    return history
