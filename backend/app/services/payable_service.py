import calendar
import uuid
from datetime import date, datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.enums import PayableRecurrence, PayableStatus
from app.models.payable import Payable, PayableCategory
from app.models.supplier import Supplier
from app.services.mappers import utc_now


def _add_months(source: date, months: int) -> date:
    month_index = source.month - 1 + months
    year = source.year + month_index // 12
    month = month_index % 12 + 1
    day = min(source.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def calculate_next_due_date(due_date: date, recurrence: str) -> date | None:
    if recurrence == PayableRecurrence.NONE:
        return None

    if recurrence == PayableRecurrence.MONTHLY:
        return _add_months(due_date, 1)
    if recurrence == PayableRecurrence.QUARTERLY:
        return _add_months(due_date, 3)
    if recurrence == PayableRecurrence.SEMIANNUAL:
        return _add_months(due_date, 6)
    if recurrence == PayableRecurrence.YEARLY:
        return date(due_date.year + 1, due_date.month, due_date.day)
    return None


def get_effective_status(payable: Payable, reference: date | None = None) -> str:
    if payable.status in {PayableStatus.PAID, PayableStatus.CANCELLED}:
        return payable.status

    today = reference or utc_now().date()
    due = payable.due_date if isinstance(payable.due_date, date) else payable.due_date
    return "overdue" if due < today else PayableStatus.PENDING


def validate_payable_input(
    db: Session,
    category_id: str,
    description: str,
    amount: float,
    supplier_id: str | None,
) -> None:
    if not description.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Informe uma descrição.")

    if amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Informe um valor válido maior que zero.",
        )

    category = db.get(PayableCategory, category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selecione uma categoria válida.",
        )

    if supplier_id and not db.get(Supplier, supplier_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selecione um fornecedor válido.",
        )


def build_next_recurring_payable(paid: Payable) -> Payable | None:
    due = paid.due_date if isinstance(paid.due_date, date) else paid.due_date
    next_due = calculate_next_due_date(due, paid.recurrence)
    if not next_due:
        return None

    return Payable(
        id=f"payable-{uuid.uuid4()}",
        category_id=paid.category_id,
        description=paid.description,
        supplier_id=paid.supplier_id,
        amount=paid.amount,
        due_date=next_due,
        recurrence=paid.recurrence,
        status=PayableStatus.PENDING,
        notes=paid.notes,
        created_at=utc_now(),
    )


def compute_payable_summary(payables: list[Payable], reference: datetime | None = None) -> dict:
    ref = reference or utc_now()
    today = ref.date()
    current_month_key = f"{today.year:04d}-{today.month:02d}"

    due_soon_count = 0
    due_soon_total = 0.0
    overdue_count = 0
    overdue_total = 0.0
    paid_this_month_count = 0
    paid_this_month_total = 0.0
    pending_this_month_total = 0.0

    for payable in payables:
        effective = get_effective_status(payable, today)

        if effective == PayableStatus.PENDING:
            due = payable.due_date if isinstance(payable.due_date, date) else payable.due_date
            days_until = (due - today).days
            if 0 <= days_until <= 7:
                due_soon_count += 1
                due_soon_total += payable.amount

        if effective == "overdue":
            overdue_count += 1
            overdue_total += payable.amount

        if payable.status == PayableStatus.PAID and payable.paid_at:
            paid_month = f"{payable.paid_at.year:04d}-{payable.paid_at.month:02d}"
            if paid_month == current_month_key:
                paid_this_month_count += 1
                paid_this_month_total += payable.paid_amount or payable.amount

        due = payable.due_date if isinstance(payable.due_date, date) else payable.due_date
        due_month = f"{due.year:04d}-{due.month:02d}"
        if due_month == current_month_key and effective in {PayableStatus.PENDING, "overdue"}:
            pending_this_month_total += payable.amount

    return {
        "dueSoonCount": due_soon_count,
        "dueSoonTotal": due_soon_total,
        "overdueCount": overdue_count,
        "overdueTotal": overdue_total,
        "paidThisMonthCount": paid_this_month_count,
        "paidThisMonthTotal": paid_this_month_total,
        "pendingThisMonthTotal": pending_this_month_total,
    }
