import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.stock import StockMovement
from app.services.mappers import utc_now
from app.services.recipe_service import (
    expand_order_stock_requirements,
    format_recipe_sources,
    get_product_stock_deduction,
    is_low_stock,
    is_out_of_stock,
)


def is_ingredient(product: Product) -> bool:
    return product.kind == "ingredient"


def tracks_own_stock(product: Product) -> bool:
    return product.kind == "menu" and product.track_stock


def load_products_map(db: Session) -> dict[str, Product]:
    products = db.query(Product).all()
    return {product.id: product for product in products}


def validate_order_stock(
    items: list[tuple[str, int]],
    products: dict[str, Product],
) -> None:
    requirements = expand_order_stock_requirements(items, products)

    for product_id, requirement in requirements.items():
        stock_product = products.get(product_id)
        if not stock_product:
            msg = "Insumo da receita não encontrado no cadastro."
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

        if not stock_product.track_stock:
            continue

        if stock_product.stock_quantity < requirement.quantity:
            source_label = format_recipe_sources(requirement.sources)
            suffix = f" — {source_label}" if source_label else ""
            msg = (
                f"Estoque insuficiente: {stock_product.name} "
                f"(disponível: {stock_product.stock_quantity}, "
                f"necessário: {requirement.quantity}{suffix})."
            )
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)


def can_add_product_to_order(
    product: Product,
    current_quantity: int,
    products: dict[str, Product],
) -> None:
    if is_ingredient(product):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insumos não podem ser vendidos diretamente.",
        )

    next_quantity = current_quantity + 1
    requirements = get_product_stock_deduction(product, next_quantity, products)

    if not requirements:
        return

    for requirement in requirements:
        stock_product = products.get(requirement.product_id)
        if not stock_product:
            msg = f"Insumo não encontrado na receita de {product.name}."
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

        if not stock_product.track_stock:
            continue

        if stock_product.stock_quantity < requirement.quantity:
            if stock_product.stock_quantity == 0:
                msg = f"{stock_product.name} esgotado (necessário para {product.name})."
            else:
                msg = (
                    f"Estoque insuficiente: {stock_product.name} "
                    f"(disponível: {stock_product.stock_quantity}, "
                    f"necessário: {requirement.quantity})."
                )
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)


def create_movement(
    product: Product,
    movement_type: str,
    delta: float,
    quantity_after: float,
    reference_id: str | None = None,
    reason: str | None = None,
    supplier_id: str | None = None,
    unit_cost: float | None = None,
    purchase_record_id: str | None = None,
) -> StockMovement:
    return StockMovement(
        id=str(uuid.uuid4()),
        product_id=product.id,
        product_name=product.name,
        type=movement_type,
        delta=delta,
        quantity_after=quantity_after,
        reference_id=reference_id,
        reason=reason,
        supplier_id=supplier_id,
        unit_cost=unit_cost,
        purchase_record_id=purchase_record_id,
        created_at=utc_now(),
    )


def deduct_stock_for_order(
    db: Session,
    items: list[tuple[str, int]],
    reference_id: str,
    products: dict[str, Product],
) -> None:
    validate_order_stock(items, products)
    requirements = expand_order_stock_requirements(items, products)

    for product_id, requirement in requirements.items():
        product = products.get(product_id)
        if not product or not product.track_stock:
            continue

        quantity_after = product.stock_quantity - requirement.quantity
        product.stock_quantity = quantity_after
        db.add(
            create_movement(
                product,
                "sale",
                -requirement.quantity,
                quantity_after,
                reference_id=reference_id,
                reason=format_recipe_sources(requirement.sources),
            ),
        )


def reverse_stock_for_sale(
    db: Session,
    sale_id: str,
    reason: str,
) -> None:
    normalized_reason = reason.strip()
    movements = (
        db.query(StockMovement)
        .filter(
            StockMovement.reference_id == sale_id,
            StockMovement.type == "sale",
        )
        .all()
    )

    for movement in movements:
        product = db.get(Product, movement.product_id)
        if not product:
            continue

        restore_delta = -movement.delta
        if restore_delta == 0:
            continue

        quantity_after = product.stock_quantity + restore_delta
        product.stock_quantity = quantity_after
        db.add(
            create_movement(
                product,
                "adjustment",
                restore_delta,
                quantity_after,
                reference_id=sale_id,
                reason=f"Reversão de venda: {normalized_reason}",
            ),
        )


def adjust_product_stock(
    db: Session,
    product_id: str,
    delta: float,
    movement_type: str,
    reason: str,
) -> StockMovement:
    if delta == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Informe uma quantidade válida diferente de zero.",
        )

    normalized_reason = reason.strip()
    if not normalized_reason:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Informe o motivo do ajuste.",
        )

    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado.")

    quantity_after = product.stock_quantity + delta
    if quantity_after < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O estoque não pode ficar negativo.",
        )

    product.stock_quantity = quantity_after
    movement = create_movement(
        product,
        movement_type,
        delta,
        quantity_after,
        reason=normalized_reason,
    )
    db.add(movement)
    return movement


def filter_stock_products(
    products: list[Product],
    stock_filter: str,
) -> list[Product]:
    tracked = [
        product
        for product in products
        if product.track_stock and (is_ingredient(product) or tracks_own_stock(product))
    ]

    if stock_filter == "low":
        return [product for product in tracked if is_low_stock(product) and not is_out_of_stock(product)]
    if stock_filter == "out":
        return [product for product in tracked if is_out_of_stock(product)]
    return tracked
