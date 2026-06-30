from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_db_session
from app.models.purchase import PurchaseRecord
from app.schemas.purchase import (
    ProductPurchaseInsightsRead,
    PurchaseCreate,
    PurchasePriceComparisonRead,
    PurchaseRecordRead,
)
from app.services.mappers import purchase_to_read
from app.services.purchase_service import (
    compare_with_last_purchase,
    get_product_purchase_history,
    get_product_purchase_insights,
    record_purchase,
)

router = APIRouter(prefix="/purchases", tags=["purchases"])


@router.get("", response_model=list[PurchaseRecordRead])
def list_purchases(
    productId: str | None = Query(default=None),
    supplierId: str | None = Query(default=None),
    db: Session = Depends(get_db_session),
) -> list[PurchaseRecordRead]:
    query = db.query(PurchaseRecord).order_by(PurchaseRecord.purchased_at.desc())
    if productId:
        query = query.filter(PurchaseRecord.product_id == productId)
    if supplierId:
        query = query.filter(PurchaseRecord.supplier_id == supplierId)
    return [purchase_to_read(record) for record in query.all()]


@router.post("", response_model=PurchaseRecordRead, status_code=201)
def create_purchase(
    body: PurchaseCreate,
    db: Session = Depends(get_db_session),
    _admin: str = Depends(get_current_admin),
) -> PurchaseRecordRead:
    purchase = record_purchase(db, body)
    db.commit()
    db.refresh(purchase)
    return purchase_to_read(purchase)


@router.get("/insights/{product_id}", response_model=ProductPurchaseInsightsRead)
def purchase_insights(
    product_id: str,
    db: Session = Depends(get_db_session),
) -> ProductPurchaseInsightsRead:
    records = get_product_purchase_history(db, product_id)
    insights = get_product_purchase_insights(records, product_id)
    return ProductPurchaseInsightsRead(
        bestRecord=purchase_to_read(insights["bestRecord"]) if insights["bestRecord"] else None,
        worstRecord=purchase_to_read(insights["worstRecord"]) if insights["worstRecord"] else None,
        savingsVsWorst=insights["savingsVsWorst"],
        savingsPercentVsWorst=insights["savingsPercentVsWorst"],
    )


@router.get("/compare", response_model=PurchasePriceComparisonRead | None)
def compare_purchase(
    productId: str = Query(),
    unitCost: float = Query(),
    db: Session = Depends(get_db_session),
) -> PurchasePriceComparisonRead | None:
    records = db.query(PurchaseRecord).order_by(PurchaseRecord.purchased_at.desc()).all()
    result = compare_with_last_purchase(records, productId, unitCost)
    if not result:
        return None
    return PurchasePriceComparisonRead(**result)
