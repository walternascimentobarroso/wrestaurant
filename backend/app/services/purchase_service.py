import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.purchase import PurchaseRecord
from app.models.supplier import Supplier
from app.schemas.purchase import PurchaseCreate
from app.services.stock_service import create_movement


def record_purchase(db: Session, input_data: PurchaseCreate) -> PurchaseRecord:
    if input_data.quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Informe uma quantidade válida maior que zero.",
        )

    if input_data.unitCost < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Informe um preço de compra válido.",
        )

    supplier = db.get(Supplier, input_data.supplierId)
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Fornecedor não encontrado.",
        )

    product = db.get(Product, input_data.productId)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Produto não encontrado.",
        )

    purchase_id = str(uuid.uuid4())
    movement_id = str(uuid.uuid4())
    quantity_after = product.stock_quantity + input_data.quantity
    notes = input_data.notes.strip() if input_data.notes else None

    purchase = PurchaseRecord(
        id=purchase_id,
        product_id=product.id,
        product_name=product.name,
        supplier_id=supplier.id,
        supplier_name=supplier.name,
        unit_cost=input_data.unitCost,
        quantity=input_data.quantity,
        total_cost=input_data.unitCost * input_data.quantity,
        purchased_at=input_data.purchasedAt,
        notes=notes,
        stock_movement_id=movement_id,
    )

    movement = create_movement(
        product,
        "restock",
        input_data.quantity,
        quantity_after,
        reason=f"Compra: {supplier.name}",
        supplier_id=supplier.id,
        unit_cost=input_data.unitCost,
        purchase_record_id=purchase_id,
    )
    movement.id = movement_id

    product.stock_quantity = quantity_after
    product.last_purchase_cost = input_data.unitCost
    product.preferred_supplier_id = supplier.id

    db.add(purchase)
    db.add(movement)
    return purchase


def get_product_purchase_history(
    db: Session,
    product_id: str,
) -> list[PurchaseRecord]:
    return (
        db.query(PurchaseRecord)
        .filter(PurchaseRecord.product_id == product_id)
        .order_by(PurchaseRecord.purchased_at.desc())
        .all()
    )


def compare_with_last_purchase(
    records: list[PurchaseRecord],
    product_id: str,
    unit_cost: float,
) -> dict | None:
    product_records = [record for record in records if record.product_id == product_id]
    if not product_records:
        return None

    last = product_records[0]
    difference = unit_cost - last.unit_cost
    percent_change = (difference / last.unit_cost * 100) if last.unit_cost else 0
    return {
        "previousUnitCost": last.unit_cost,
        "previousSupplierName": last.supplier_name,
        "difference": difference,
        "percentChange": percent_change,
        "isCheaper": difference < 0,
    }


def get_product_purchase_insights(records: list[PurchaseRecord], product_id: str) -> dict:
    product_records = [record for record in records if record.product_id == product_id]
    if not product_records:
        return {
            "bestRecord": None,
            "worstRecord": None,
            "savingsVsWorst": None,
            "savingsPercentVsWorst": None,
        }

    best = min(product_records, key=lambda record: record.unit_cost)
    worst = max(product_records, key=lambda record: record.unit_cost)
    savings = worst.unit_cost - best.unit_cost if worst.id != best.id else None
    savings_percent = (savings / worst.unit_cost * 100) if savings and worst.unit_cost else None

    return {
        "bestRecord": best,
        "worstRecord": worst,
        "savingsVsWorst": savings,
        "savingsPercentVsWorst": savings_percent,
    }
