import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_db_session
from app.models.payable import Payable
from app.models.supplier import Supplier
from app.schemas.supplier import SupplierCreate, SupplierRead, SupplierUpdate
from app.services.mappers import supplier_to_read, utc_now
from app.services.text_normalization import normalize_tax_id

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


def _resolve_tax_id(raw: str | None) -> str | None:
    if raw is None:
        return None
    normalized = normalize_tax_id(raw)
    return normalized or None


def _assert_tax_id_available(
    db: Session,
    tax_id: str | None,
    *,
    exclude_supplier_id: str | None = None,
) -> None:
    if not tax_id:
        return

    query = db.query(Supplier).filter(Supplier.tax_id == tax_id)
    if exclude_supplier_id is not None:
        query = query.filter(Supplier.id != exclude_supplier_id)

    if query.first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe um fornecedor com este NIF/CNPJ.",
        )


@router.get("", response_model=list[SupplierRead])
def list_suppliers(db: Session = Depends(get_db_session)) -> list[SupplierRead]:
    suppliers = db.query(Supplier).order_by(Supplier.name).all()
    return [supplier_to_read(supplier) for supplier in suppliers]


@router.post("", response_model=SupplierRead, status_code=status.HTTP_201_CREATED)
def create_supplier(
    body: SupplierCreate,
    db: Session = Depends(get_db_session),
    _admin: str = Depends(get_current_admin),
) -> SupplierRead:
    name = body.name.strip()
    existing = db.query(Supplier).filter(Supplier.name.ilike(name)).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Já existe um fornecedor com este nome.")

    tax_id = _resolve_tax_id(body.taxId)
    _assert_tax_id_available(db, tax_id)

    supplier = Supplier(
        id=f"supplier-{uuid.uuid4()}",
        name=name,
        tax_id=tax_id,
        trade_name=body.tradeName,
        legal_name=body.legalName,
        contact_name=body.contactName,
        email=str(body.email) if body.email else None,
        phone=body.phone,
        notes=body.notes,
        created_at=utc_now(),
    )
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier_to_read(supplier)


@router.patch("/{supplier_id}", response_model=SupplierRead)
def update_supplier(
    supplier_id: str,
    body: SupplierUpdate,
    db: Session = Depends(get_db_session),
    _admin: str = Depends(get_current_admin),
) -> SupplierRead:
    supplier = db.get(Supplier, supplier_id)
    if not supplier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fornecedor não encontrado.")

    if body.name is not None:
        name = body.name.strip()
        conflict = (
            db.query(Supplier)
            .filter(Supplier.id != supplier_id, Supplier.name.ilike(name))
            .first()
        )
        if conflict:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Nome já em uso.")
        supplier.name = name

    if body.contactName is not None:
        supplier.contact_name = body.contactName
    if body.taxId is not None:
        tax_id = _resolve_tax_id(body.taxId)
        _assert_tax_id_available(db, tax_id, exclude_supplier_id=supplier_id)
        supplier.tax_id = tax_id
    if body.tradeName is not None:
        supplier.trade_name = body.tradeName
    if body.legalName is not None:
        supplier.legal_name = body.legalName
    if body.email is not None:
        supplier.email = str(body.email) if body.email else None
    if body.phone is not None:
        supplier.phone = body.phone
    if body.notes is not None:
        supplier.notes = body.notes

    db.commit()
    db.refresh(supplier)
    return supplier_to_read(supplier)


@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_supplier(
    supplier_id: str,
    db: Session = Depends(get_db_session),
    _admin: str = Depends(get_current_admin),
) -> None:
    supplier = db.get(Supplier, supplier_id)
    if not supplier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fornecedor não encontrado.")

    payables_count = db.query(Payable).filter(Payable.supplier_id == supplier_id).count()
    if payables_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Não é possível excluir: {payables_count} conta(s) vinculada(s).",
        )

    db.delete(supplier)
    db.commit()
