from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_admin, get_db_session
from app.models.sale import Sale
from app.schemas.sale import SaleCreate, SaleRead, SalesByDayRead, SalesSummaryRead, SaleUpdate
from app.services.mappers import sale_to_read
from app.services.sale_service import create_manual_sale, delete_sale, update_sale

router = APIRouter(prefix="/sales", tags=["sales"])


@router.get("", response_model=list[SaleRead])
def list_sales(
    date: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
    db: Session = Depends(get_db_session),
) -> list[SaleRead]:
    query = db.query(Sale).options(joinedload(Sale.items)).order_by(Sale.paid_at.desc())
    sales = query.all()

    if date:
        sales = [sale for sale in sales if sale.paid_at.strftime("%Y-%m-%d") == date]

    return [sale_to_read(sale) for sale in sales]


@router.get("/summary", response_model=SalesSummaryRead)
def sales_summary(db: Session = Depends(get_db_session)) -> SalesSummaryRead:
    sales = db.query(Sale).all()
    today = datetime.now(UTC).strftime("%Y-%m-%d")
    daily = [sale for sale in sales if sale.paid_at.strftime("%Y-%m-%d") == today]

    return SalesSummaryRead(
        allTimeTotal=sum(sale.total for sale in sales),
        allSalesCount=len(sales),
        dailyTotal=sum(sale.total for sale in daily),
        dailySalesCount=len(daily),
    )


@router.get("/by-day", response_model=list[SalesByDayRead])
def sales_by_day(db: Session = Depends(get_db_session)) -> list[SalesByDayRead]:
    sales = db.query(Sale).all()
    grouped: dict[str, list[Sale]] = {}
    for sale in sales:
        key = sale.paid_at.strftime("%Y-%m-%d")
        grouped.setdefault(key, []).append(sale)

    return [
        SalesByDayRead(
            dateKey=date_key,
            total=sum(sale.total for sale in day_sales),
            count=len(day_sales),
        )
        for date_key, day_sales in sorted(grouped.items(), reverse=True)
    ]


@router.post("", response_model=SaleRead, status_code=status.HTTP_201_CREATED)
def create_sale(
    body: SaleCreate,
    db: Session = Depends(get_db_session),
    _admin: str = Depends(get_current_admin),
) -> SaleRead:
    sale = create_manual_sale(db, body)
    return sale_to_read(sale)


@router.get("/{sale_id}", response_model=SaleRead)
def get_sale(sale_id: str, db: Session = Depends(get_db_session)) -> SaleRead:
    sale = db.query(Sale).options(joinedload(Sale.items)).filter(Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Venda não encontrada.")
    return sale_to_read(sale)


@router.patch("/{sale_id}", response_model=SaleRead)
def patch_sale(
    sale_id: str,
    body: SaleUpdate,
    db: Session = Depends(get_db_session),
    _admin: str = Depends(get_current_admin),
) -> SaleRead:
    sale = update_sale(db, sale_id, body)
    return sale_to_read(sale)


@router.delete("/{sale_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_sale(
    sale_id: str,
    reason: str = Query(min_length=3),
    db: Session = Depends(get_db_session),
    _admin: str = Depends(get_current_admin),
) -> None:
    delete_sale(db, sale_id, reason)
