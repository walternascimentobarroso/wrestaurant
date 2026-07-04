import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_admin, get_db_session
from app.models.product import Product
from app.models.sale import Sale, SaleItem
from app.models.table import RestaurantTable, TableOrderItem
from app.schemas.table import (
    AddTableItemRequest,
    PaymentRequest,
    TableCreate,
    TableRead,
    TableUpdate,
    TableWithDetailsRead,
)
from app.services.mappers import sale_to_read, table_with_details, utc_now
from app.services.stock_service import (
    can_add_product_to_order,
    deduct_stock_for_order,
    load_products_map,
    validate_order_stock,
)

router = APIRouter(prefix="/tables", tags=["tables"])


def _get_table(db: Session, table_id: int) -> RestaurantTable:
    table = (
        db.query(RestaurantTable)
        .options(joinedload(RestaurantTable.order_items))
        .filter(RestaurantTable.id == table_id)
        .first()
    )
    if not table:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mesa não encontrada.")
    return table


@router.get("", response_model=list[TableWithDetailsRead])
def list_tables(db: Session = Depends(get_db_session)) -> list[TableWithDetailsRead]:
    tables = (
        db.query(RestaurantTable)
        .options(joinedload(RestaurantTable.order_items))
        .order_by(RestaurantTable.category, RestaurantTable.number)
        .all()
    )
    products = db.query(Product).all()
    return [table_with_details(table, products) for table in tables]


@router.get("/{table_id}", response_model=TableWithDetailsRead)
def get_table(table_id: int, db: Session = Depends(get_db_session)) -> TableWithDetailsRead:
    table = _get_table(db, table_id)
    products = db.query(Product).all()
    return table_with_details(table, products)


@router.post("/{table_id}/items", response_model=TableWithDetailsRead)
def add_table_item(
    table_id: int,
    body: AddTableItemRequest,
    db: Session = Depends(get_db_session),
) -> TableWithDetailsRead:
    table = _get_table(db, table_id)
    products_map = load_products_map(db)
    product = products_map.get(body.productId)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado.")

    current_qty = next(
        (item.quantity for item in table.order_items if item.product_id == body.productId),
        0,
    )
    can_add_product_to_order(product, current_qty, products_map)

    existing = next((item for item in table.order_items if item.product_id == body.productId), None)
    if existing:
        existing.quantity += 1
    else:
        table.order_items.append(TableOrderItem(product_id=body.productId, quantity=1))

    table.status = "occupied"
    if not table.opened_at:
        table.opened_at = utc_now()

    db.commit()
    db.refresh(table)
    products = db.query(Product).all()
    return table_with_details(table, products)


@router.patch("/{table_id}/items/{product_id}", response_model=TableWithDetailsRead)
def decrement_table_item(
    table_id: int,
    product_id: str,
    db: Session = Depends(get_db_session),
) -> TableWithDetailsRead:
    table = _get_table(db, table_id)
    item = next((entry for entry in table.order_items if entry.product_id == product_id), None)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item não encontrado.")

    item.quantity -= 1
    if item.quantity <= 0:
        table.order_items.remove(item)

    if not table.order_items:
        table.status = "free"
        table.opened_at = None
    else:
        table.status = "occupied"

    db.commit()
    db.refresh(table)
    products = db.query(Product).all()
    return table_with_details(table, products)


@router.delete("/{table_id}/items", response_model=TableWithDetailsRead)
def clear_table(table_id: int, db: Session = Depends(get_db_session)) -> TableWithDetailsRead:
    table = _get_table(db, table_id)
    table.order_items.clear()
    table.status = "free"
    table.opened_at = None
    db.commit()
    db.refresh(table)
    products = db.query(Product).all()
    return table_with_details(table, products)


@router.post("/{table_id}/payment", response_model=dict)
def receive_payment(
    table_id: int,
    body: PaymentRequest,
    db: Session = Depends(get_db_session),
) -> dict:
    table = _get_table(db, table_id)
    if not table.order_items:
        return {"ok": True}

    products_map = load_products_map(db)
    order_items = [(item.product_id, item.quantity) for item in table.order_items]
    validate_order_stock(order_items, products_map)

    sale_id = str(uuid.uuid4())
    sale_items: list[SaleItem] = []
    total = 0.0
    descriptions: list[str] = []

    for item in table.order_items:
        product = products_map.get(item.product_id)
        if not product:
            continue
        subtotal = product.price * item.quantity
        total += subtotal
        descriptions.append(f"{item.quantity}x {product.name}")
        sale_items.append(
            SaleItem(
                product_id=product.id,
                product_name=product.name,
                quantity=item.quantity,
                unit_price=product.price,
                subtotal=subtotal,
            ),
        )

    sale = Sale(
        id=sale_id,
        table_number=table.number,
        opened_at=table.opened_at,
        paid_at=utc_now(),
        payment_method=body.method,
        amount_received=body.amountReceived,
        change=body.change,
        total=total,
        description=", ".join(descriptions),
        items=sale_items,
        source="table",
    )

    deduct_stock_for_order(db, order_items, sale_id, products_map)

    table.order_items.clear()
    table.status = "free"
    table.opened_at = None

    db.add(sale)
    db.commit()

    return {"ok": True, "saleId": sale_id}


@router.post("", response_model=TableRead, status_code=status.HTTP_201_CREATED)
def create_table(
    body: TableCreate,
    db: Session = Depends(get_db_session),
    _admin: str = Depends(get_current_admin),
) -> TableRead:
    max_id = db.query(RestaurantTable.id).order_by(RestaurantTable.id.desc()).first()
    next_id = (max_id[0] if max_id else 0) + 1
    table = RestaurantTable(
        id=next_id,
        number=body.number,
        category=body.category,
        status="free",
    )
    db.add(table)
    db.commit()
    db.refresh(table)
    products = db.query(Product).all()
    return table_with_details(table, products)


@router.patch("/{table_id}", response_model=TableWithDetailsRead)
def update_table(
    table_id: int,
    body: TableUpdate,
    db: Session = Depends(get_db_session),
    _admin: str = Depends(get_current_admin),
) -> TableWithDetailsRead:
    table = _get_table(db, table_id)
    if body.number is not None:
        table.number = body.number
    if body.category is not None:
        table.category = body.category
    db.commit()
    db.refresh(table)
    products = db.query(Product).all()
    return table_with_details(table, products)


@router.delete("/{table_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_table(
    table_id: int,
    db: Session = Depends(get_db_session),
    _admin: str = Depends(get_current_admin),
) -> None:
    table = _get_table(db, table_id)
    if table.order_items:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Mesa com pedido ativo.")
    db.delete(table)
    db.commit()
