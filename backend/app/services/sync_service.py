from datetime import UTC, datetime

from sqlalchemy.orm import Session, joinedload

from app.models.checklist import ChecklistCompletion, ChecklistItem, ChecklistTemplate
from app.models.menu import MenuCategory
from app.models.payable import Payable
from app.models.product import Product
from app.models.purchase import PurchaseRecord
from app.models.sale import Sale
from app.models.settings import AppSettings
from app.models.stock import StockMovement
from app.models.supplier import Supplier
from app.models.table import RestaurantTable, TableOrderItem
from app.schemas.sync import ChecklistSyncBundle, SyncDeltaRead, SyncSnapshotRead
from app.services.mappers import (
    category_to_read,
    checklist_item_to_read,
    checklist_template_to_read,
    completion_to_read,
    movement_to_read,
    payable_to_read,
    product_to_read,
    purchase_to_read,
    sale_to_read,
    settings_to_read,
    supplier_to_read,
    table_with_details,
)


def _utc_now() -> datetime:
    return datetime.now(UTC)


def _load_tables(db: Session) -> list[RestaurantTable]:
    return (
        db.query(RestaurantTable)
        .options(joinedload(RestaurantTable.order_items))
        .order_by(RestaurantTable.category, RestaurantTable.number)
        .all()
    )


def _load_products(db: Session) -> list[Product]:
    return (
        db.query(Product)
        .options(joinedload(Product.recipe_lines))
        .order_by(Product.name)
        .all()
    )


def _load_menu_catalog(db: Session) -> list[MenuCategory]:
    return (
        db.query(MenuCategory)
        .options(joinedload(MenuCategory.subcategories))
        .order_by(MenuCategory.name)
        .all()
    )


def _load_checklist_bundle(db: Session) -> ChecklistSyncBundle:
    templates = (
        db.query(ChecklistTemplate)
        .order_by(ChecklistTemplate.sort_order, ChecklistTemplate.title)
        .all()
    )
    items = (
        db.query(ChecklistItem)
        .order_by(ChecklistItem.template_id, ChecklistItem.sort_order)
        .all()
    )
    completions = db.query(ChecklistCompletion).all()
    return ChecklistSyncBundle(
        templates=[checklist_template_to_read(template) for template in templates],
        items=[checklist_item_to_read(item) for item in items],
        completions=[completion_to_read(completion) for completion in completions],
    )


def _load_changed_tables(db: Session, since: datetime) -> list[RestaurantTable]:
    table_ids_from_items = {
        row[0]
        for row in db.query(TableOrderItem.table_id)
        .filter(TableOrderItem.updated_at > since)
        .distinct()
        .all()
    }
    table_ids_from_tables = {
        row[0]
        for row in db.query(RestaurantTable.id)
        .filter(RestaurantTable.updated_at > since)
        .all()
    }
    table_ids = table_ids_from_items | table_ids_from_tables
    if not table_ids:
        return []

    return (
        db.query(RestaurantTable)
        .options(joinedload(RestaurantTable.order_items))
        .filter(RestaurantTable.id.in_(table_ids))
        .all()
    )


def build_sync_snapshot(db: Session) -> SyncSnapshotRead:
    server_time = _utc_now()
    tables = _load_tables(db)
    products = _load_products(db)
    product_reads = [product_to_read(product) for product in products]

    settings = db.get(AppSettings, "default")
    if settings is None:
        settings = AppSettings(id="default")
        db.add(settings)
        db.commit()
        db.refresh(settings)

    return SyncSnapshotRead(
        tables=[table_with_details(table, products) for table in tables],
        products=product_reads,
        settings=settings_to_read(settings),
        menuCatalog=[category_to_read(category) for category in _load_menu_catalog(db)],
        sales=[sale_to_read(sale) for sale in db.query(Sale).order_by(Sale.paid_at.desc()).all()],
        payables=[payable_to_read(payable) for payable in db.query(Payable).all()],
        suppliers=[
            supplier_to_read(supplier)
            for supplier in db.query(Supplier).order_by(Supplier.name).all()
        ],
        purchases=[
            purchase_to_read(record)
            for record in db.query(PurchaseRecord).order_by(PurchaseRecord.purchased_at.desc()).all()
        ],
        stockMovements=[
            movement_to_read(movement)
            for movement in db.query(StockMovement).order_by(StockMovement.created_at.desc()).all()
        ],
        checklists=_load_checklist_bundle(db),
        serverTime=server_time,
    )


def build_sync_delta(db: Session, since: datetime) -> SyncDeltaRead:
    server_time = _utc_now()
    products = _load_products(db)
    product_reads = [product_to_read(product) for product in products if product.updated_at > since]
    delta_tables = _load_changed_tables(db, since)

    settings = db.get(AppSettings, "default")
    settings_read = settings_to_read(settings) if settings and settings.updated_at > since else None

    menu_categories = [
        category_to_read(category)
        for category in _load_menu_catalog(db)
        if category.updated_at > since
        or any(sub.updated_at > since for sub in category.subcategories)
    ]

    templates = [
        checklist_template_to_read(template)
        for template in db.query(ChecklistTemplate).filter(ChecklistTemplate.updated_at > since).all()
    ]
    items = [
        checklist_item_to_read(item)
        for item in db.query(ChecklistItem).filter(ChecklistItem.updated_at > since).all()
    ]
    completions = [
        completion_to_read(completion)
        for completion in db.query(ChecklistCompletion)
        .filter(ChecklistCompletion.updated_at > since)
        .all()
    ]

    return SyncDeltaRead(
        since=since,
        serverTime=server_time,
        tables=[table_with_details(table, products) for table in delta_tables],
        products=product_reads,
        settings=settings_read,
        menuCatalog=menu_categories,
        sales=[
            sale_to_read(sale)
            for sale in db.query(Sale).filter(Sale.updated_at > since).all()
        ],
        payables=[
            payable_to_read(payable)
            for payable in db.query(Payable).filter(Payable.updated_at > since).all()
        ],
        suppliers=[
            supplier_to_read(supplier)
            for supplier in db.query(Supplier).filter(Supplier.updated_at > since).all()
        ],
        purchases=[
            purchase_to_read(record)
            for record in db.query(PurchaseRecord).filter(PurchaseRecord.updated_at > since).all()
        ],
        stockMovements=[
            movement_to_read(movement)
            for movement in db.query(StockMovement).filter(StockMovement.updated_at > since).all()
        ],
        checklists=ChecklistSyncBundle(
            templates=templates,
            items=items,
            completions=completions,
        ),
    )
