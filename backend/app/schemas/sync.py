from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.checklist import (
    ChecklistCompletionRead,
    ChecklistItemRead,
    ChecklistTemplateRead,
)
from app.schemas.menu import MenuCategoryRead
from app.schemas.payable import PayableRead
from app.schemas.product import ProductRead
from app.schemas.purchase import PurchaseRecordRead
from app.schemas.sale import SaleRead
from app.schemas.settings import AppSettingsRead
from app.schemas.stock import StockMovementRead
from app.schemas.supplier import SupplierRead
from app.schemas.table import TableWithDetailsRead


class ChecklistSyncBundle(BaseModel):
    templates: list[ChecklistTemplateRead]
    items: list[ChecklistItemRead]
    completions: list[ChecklistCompletionRead] = Field(default_factory=list)


class SyncSnapshotRead(BaseModel):
    tables: list[TableWithDetailsRead]
    products: list[ProductRead]
    settings: AppSettingsRead
    menuCatalog: list[MenuCategoryRead]
    sales: list[SaleRead]
    payables: list[PayableRead]
    suppliers: list[SupplierRead]
    purchases: list[PurchaseRecordRead]
    stockMovements: list[StockMovementRead]
    checklists: ChecklistSyncBundle
    serverTime: datetime


class SyncDeltaRead(BaseModel):
    since: datetime
    serverTime: datetime
    tables: list[TableWithDetailsRead]
    products: list[ProductRead]
    settings: AppSettingsRead | None = None
    menuCatalog: list[MenuCategoryRead] = Field(default_factory=list)
    sales: list[SaleRead]
    payables: list[PayableRead]
    suppliers: list[SupplierRead]
    purchases: list[PurchaseRecordRead]
    stockMovements: list[StockMovementRead] = Field(default_factory=list)
    checklists: ChecklistSyncBundle
