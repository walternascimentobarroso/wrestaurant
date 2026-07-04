import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.enums import PaymentMethod
from app.models.product import Product
from app.models.sale import Sale, SaleItem
from app.schemas.sale import SaleCreate, SaleItemInput, SaleUpdate
from app.services.mappers import utc_now
from app.services.stock_service import (
    deduct_stock_for_order,
    load_products_map,
    reverse_stock_for_sale,
    validate_order_stock,
)


def validate_sale_reason(reason: str) -> str:
    normalized = reason.strip()
    if len(normalized) < 3:
        msg = "Informe o motivo da correção (mínimo 3 caracteres)."
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)
    return normalized


def _build_sale_items(
    items_input: list[SaleItemInput],
    products: dict[str, Product],
) -> tuple[list[SaleItem], float, str]:
    if not items_input:
        msg = "Informe pelo menos um item na venda."
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    sale_items: list[SaleItem] = []
    total = 0.0
    descriptions: list[str] = []

    for entry in items_input:
        product = products.get(entry.productId)
        if not product:
            msg = f"Produto não encontrado: {entry.productId}."
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

        if product.kind == "ingredient":
            msg = f"Insumos não podem ser vendidos diretamente: {product.name}."
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

        subtotal = product.price * entry.quantity
        total += subtotal
        descriptions.append(f"{entry.quantity}x {product.name}")
        sale_items.append(
            SaleItem(
                product_id=product.id,
                product_name=product.name,
                quantity=entry.quantity,
                unit_price=product.price,
                subtotal=subtotal,
            ),
        )

    return sale_items, total, ", ".join(descriptions)


def _order_items_from_sale_items(items: list[SaleItem]) -> list[tuple[str, int]]:
    return [(item.product_id, item.quantity) for item in items]


def _items_changed(current: Sale, items_input: list[SaleItemInput]) -> bool:
    current_map = {item.product_id: item.quantity for item in current.items}
    next_map = {entry.productId: entry.quantity for entry in items_input}
    return current_map != next_map


def create_manual_sale(db: Session, body: SaleCreate) -> Sale:
    reason = validate_sale_reason(body.reason)
    products_map = load_products_map(db)
    order_items = [(entry.productId, entry.quantity) for entry in body.items]
    validate_order_stock(order_items, products_map)

    sale_items, total, description = _build_sale_items(body.items, products_map)
    sale_id = str(uuid.uuid4())

    sale = Sale(
        id=sale_id,
        table_number=body.tableNumber,
        opened_at=body.openedAt,
        paid_at=body.paidAt,
        payment_method=body.paymentMethod,
        amount_received=body.amountReceived,
        change=body.change,
        total=total,
        description=description,
        items=sale_items,
        source="manual",
        adjustment_reason=reason,
    )

    deduct_stock_for_order(db, order_items, sale_id, products_map)
    db.add(sale)
    db.commit()
    db.refresh(sale)
    return sale


def update_sale(db: Session, sale_id: str, body: SaleUpdate) -> Sale:
    reason = validate_sale_reason(body.reason)
    sale = db.query(Sale).filter(Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Venda não encontrada.")

    products_map = load_products_map(db)
    items_changed = body.items is not None and _items_changed(sale, body.items)

    if items_changed and body.items is not None:
        reverse_stock_for_sale(db, sale_id, reason)
        order_items = [(entry.productId, entry.quantity) for entry in body.items]
        validate_order_stock(order_items, products_map)
        sale_items, total, description = _build_sale_items(body.items, products_map)
        sale.items.clear()
        sale.items.extend(sale_items)
        sale.total = total
        sale.description = description
        deduct_stock_for_order(db, order_items, sale_id, products_map)

    if body.tableNumber is not None:
        sale.table_number = body.tableNumber
    if body.paidAt is not None:
        sale.paid_at = body.paidAt
    if body.openedAt is not None:
        sale.opened_at = body.openedAt
    if body.paymentMethod is not None:
        sale.payment_method = body.paymentMethod
    if body.amountReceived is not None:
        sale.amount_received = body.amountReceived
    if body.change is not None:
        sale.change = body.change

    sale.source = "adjusted" if sale.source == "table" else sale.source
    sale.adjustment_reason = reason
    sale.updated_at = utc_now()

    db.commit()
    db.refresh(sale)
    return sale


def delete_sale(db: Session, sale_id: str, reason: str) -> None:
    normalized_reason = validate_sale_reason(reason)
    sale = db.query(Sale).filter(Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Venda não encontrada.")

    reverse_stock_for_sale(db, sale_id, normalized_reason)
    db.delete(sale)
    db.commit()
