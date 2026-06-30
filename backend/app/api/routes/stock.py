from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_db_session
from app.models.product import Product
from app.models.stock import StockMovement
from app.schemas.product import ProductRead
from app.schemas.stock import StockAdjustmentCreate, StockMovementRead
from app.services.mappers import movement_to_read, product_to_read
from app.services.stock_service import adjust_product_stock, filter_stock_products

router = APIRouter(prefix="/stock", tags=["stock"])


@router.get("/products", response_model=list[ProductRead])
def list_stock_products(
    filter: str = Query(default="all", alias="filter"),
    db: Session = Depends(get_db_session),
) -> list[ProductRead]:
    products = db.query(Product).all()
    filtered = filter_stock_products(products, filter)
    return [product_to_read(product) for product in filtered]


@router.get("/movements", response_model=list[StockMovementRead])
def list_movements(
    productId: str | None = Query(default=None),
    db: Session = Depends(get_db_session),
) -> list[StockMovementRead]:
    query = db.query(StockMovement).order_by(StockMovement.created_at.desc())
    if productId:
        query = query.filter(StockMovement.product_id == productId)
    return [movement_to_read(movement) for movement in query.limit(200).all()]


@router.post("/adjustments", response_model=StockMovementRead)
def create_adjustment(
    body: StockAdjustmentCreate,
    db: Session = Depends(get_db_session),
    _admin: str = Depends(get_current_admin),
) -> StockMovementRead:
    movement = adjust_product_stock(db, body.productId, body.delta, body.type, body.reason)
    db.commit()
    db.refresh(movement)
    return movement_to_read(movement)
