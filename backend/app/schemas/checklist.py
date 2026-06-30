from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.models.enums import ChecklistType


class ChecklistTemplateRead(BaseModel):
    id: str
    type: ChecklistType
    title: str
    timeWindowStart: str
    timeWindowEnd: str
    sortOrder: int
    active: bool


class ChecklistItemRead(BaseModel):
    id: str
    templateId: str
    label: str
    sortOrder: int
    daysOfWeek: Literal["all"] | list[int]
    active: bool


class ChecklistCompletionRead(BaseModel):
    id: str
    dateKey: str
    itemId: str
    completedAt: datetime


class ResolvedChecklistItemRead(BaseModel):
    item: ChecklistItemRead
    completed: bool
    completedAt: datetime | None = None
    isDaySpecific: bool


class ChecklistProgressRead(BaseModel):
    completed: int
    total: int
    isComplete: bool


class DailyChecklistRead(BaseModel):
    dateKey: str
    opening: list[ResolvedChecklistItemRead]
    closing: list[ResolvedChecklistItemRead]
    openingProgress: ChecklistProgressRead
    closingProgress: ChecklistProgressRead


class ChecklistHistoryDayRead(BaseModel):
    dateKey: str
    opening: ChecklistProgressRead
    closing: ChecklistProgressRead


class ToggleCompletionRequest(BaseModel):
    itemId: str
    dateKey: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")


class ChecklistItemCreate(BaseModel):
    templateId: str
    label: str = Field(min_length=1, max_length=200)
    daysOfWeek: Literal["all"] | list[int] = "all"
    sortOrder: int | None = None


class ChecklistItemUpdate(BaseModel):
    label: str = Field(min_length=1, max_length=200)
    daysOfWeek: Literal["all"] | list[int]
    active: bool
    sortOrder: int


class ChecklistTemplateUpdate(BaseModel):
    timeWindowStart: str
    timeWindowEnd: str
    active: bool


class MoveItemRequest(BaseModel):
    direction: Literal["up", "down"]
