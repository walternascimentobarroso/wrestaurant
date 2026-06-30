import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_db_session
from app.models.enums import PayableRecurrence, PayableStatus
from app.models.payable import Payable, PayableCategory
from app.schemas.payable import (
    MarkPaidRequest,
    PayableCategoryRead,
    PayableCreate,
    PayableRead,
    PayableSummaryRead,
    PayableUpdate,
)
from app.services.mappers import payable_to_read, utc_now
from app.services.payable_service import (
    build_next_recurring_payable,
    compute_payable_summary,
    get_effective_status,
    validate_payable_input,
)

router = APIRouter(prefix="/payables", tags=["payables"])


@router.get("/categories", response_model=list[PayableCategoryRead])
def list_categories(db: Session = Depends(get_db_session)) -> list[PayableCategoryRead]:
    return db.query(PayableCategory).all()


@router.get("", response_model=list[PayableRead])
def list_payables(
    status_filter: str = Query(default="all", alias="status"),
    month: str = Query(default="all"),
    q: str = Query(default=""),
    db: Session = Depends(get_db_session),
) -> list[PayableRead]:
    payables = db.query(Payable).order_by(Payable.due_date.desc()).all()
    query = q.strip().lower()
    reference = utc_now()

    filtered: list[Payable] = []
    for payable in payables:
        effective = get_effective_status(payable, reference.date())
        if status_filter != "all" and effective != status_filter:
            continue

        if month != "all":
            due_month = payable.due_date.strftime("%Y-%m")
            if effective == PayableStatus.PAID and payable.paid_at:
                paid_month = payable.paid_at.strftime("%Y-%m")
                if paid_month != month:
                    continue
            elif due_month != month:
                continue

        if query:
            haystack = payable.description.lower()
            if query not in haystack:
                continue

        filtered.append(payable)

    return [payable_to_read(payable) for payable in filtered]


@router.get("/summary", response_model=PayableSummaryRead)
def payables_summary(db: Session = Depends(get_db_session)) -> PayableSummaryRead:
    payables = db.query(Payable).all()
    summary = compute_payable_summary(payables)
    return PayableSummaryRead(**summary)


@router.post("", response_model=PayableRead, status_code=status.HTTP_201_CREATED)
def create_payable(
    body: PayableCreate,
    db: Session = Depends(get_db_session),
    _admin: str = Depends(get_current_admin),
) -> PayableRead:
    validate_payable_input(db, body.categoryId, body.description, body.amount, body.supplierId)

    status_value = body.status or PayableStatus.PENDING
    payable = Payable(
        id=f"payable-{uuid.uuid4()}",
        category_id=body.categoryId,
        description=body.description.strip(),
        supplier_id=body.supplierId,
        amount=body.amount,
        due_date=body.dueDate,
        recurrence=body.recurrence,
        status=status_value,
        paid_at=body.paidAt,
        paid_amount=body.paidAmount,
        notes=body.notes,
        created_at=utc_now(),
    )
    db.add(payable)

    if payable.status == PayableStatus.PAID and payable.recurrence != PayableRecurrence.NONE:
        next_payable = build_next_recurring_payable(payable)
        if next_payable:
            db.add(next_payable)

    db.commit()
    db.refresh(payable)
    return payable_to_read(payable)


@router.patch("/{payable_id}", response_model=PayableRead)
def update_payable(
    payable_id: str,
    body: PayableUpdate,
    db: Session = Depends(get_db_session),
    _admin: str = Depends(get_current_admin),
) -> PayableRead:
    payable = db.get(Payable, payable_id)
    if not payable:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conta não encontrada.")

    was_paid = payable.status == PayableStatus.PAID

    if body.categoryId is not None:
        payable.category_id = body.categoryId
    if body.description is not None:
        payable.description = body.description.strip()
    if body.supplierId is not None:
        payable.supplier_id = body.supplierId or None
    if body.amount is not None:
        payable.amount = body.amount
    if body.dueDate is not None:
        payable.due_date = body.dueDate
    if body.recurrence is not None:
        payable.recurrence = body.recurrence
    if body.notes is not None:
        payable.notes = body.notes
    if body.status is not None:
        payable.status = body.status
        if body.status == PayableStatus.PENDING:
            payable.paid_at = None
            payable.paid_amount = None
    if body.paidAt is not None:
        payable.paid_at = body.paidAt
    if body.paidAmount is not None:
        payable.paid_amount = body.paidAmount

    validate_payable_input(
        db,
        payable.category_id,
        payable.description,
        payable.amount,
        payable.supplier_id,
    )

    if not was_paid and payable.status == PayableStatus.PAID and payable.recurrence != PayableRecurrence.NONE:
        next_payable = build_next_recurring_payable(payable)
        if next_payable:
            db.add(next_payable)

    db.commit()
    db.refresh(payable)
    return payable_to_read(payable)


@router.delete("/{payable_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_payable(
    payable_id: str,
    db: Session = Depends(get_db_session),
    _admin: str = Depends(get_current_admin),
) -> None:
    payable = db.get(Payable, payable_id)
    if not payable:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conta não encontrada.")
    db.delete(payable)
    db.commit()


@router.post("/{payable_id}/mark-paid", response_model=PayableRead)
def mark_paid(
    payable_id: str,
    body: MarkPaidRequest,
    db: Session = Depends(get_db_session),
    _admin: str = Depends(get_current_admin),
) -> PayableRead:
    payable = db.get(Payable, payable_id)
    if not payable:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conta não encontrada.")

    payable.status = PayableStatus.PAID
    payable.paid_at = body.paidAt
    payable.paid_amount = body.paidAmount

    if payable.recurrence != PayableRecurrence.NONE:
        next_payable = build_next_recurring_payable(payable)
        if next_payable:
            db.add(next_payable)

    db.commit()
    db.refresh(payable)
    return payable_to_read(payable)


@router.post("/{payable_id}/mark-pending", response_model=PayableRead)
def mark_pending(
    payable_id: str,
    db: Session = Depends(get_db_session),
    _admin: str = Depends(get_current_admin),
) -> PayableRead:
    payable = db.get(Payable, payable_id)
    if not payable:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conta não encontrada.")

    payable.status = PayableStatus.PENDING
    payable.paid_at = None
    payable.paid_amount = None
    db.commit()
    db.refresh(payable)
    return payable_to_read(payable)
