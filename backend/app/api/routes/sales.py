from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload

from app.models.sale import Sale
from app.schemas.sale import SaleRead, SalesByDayRead, SalesSummaryRead
from app.api.deps import get_db_session
from app.services.mappers import sale_to_read

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


@router.get("/{sale_id}", response_model=SaleRead)
def get_sale(sale_id: str, db: Session = Depends(get_db_session)) -> SaleRead:
    sale = db.query(Sale).options(joinedload(Sale.items)).filter(Sale.id == sale_id).first()
    if not sale:
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Venda não encontrada.")
    return sale_to_read(sale)
