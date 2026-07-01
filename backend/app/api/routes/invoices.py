import hashlib

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_db_session
from app.models.invoice_import import InvoiceImport
from app.models.supplier import Supplier
from app.schemas.invoice import (
    InvoiceConfirmRequest,
    InvoiceConfirmResult,
    InvoiceDraft,
    InvoiceImportDetailRead,
    InvoiceImportRead,
    InvoiceSuggestRequest,
    InvoiceSuggestResponse,
)
from app.services.invoice_import_service import confirm_invoice_import
from app.services.invoice_matching_service import suggest_item_mappings, suggest_suppliers
from app.services.invoice_parsers import UnsupportedInvoiceFormatError, detect_and_parse
from app.services.mappers import invoice_import_to_detail_read, invoice_import_to_read

router = APIRouter(prefix="/invoices", tags=["invoices"])


@router.get("", response_model=list[InvoiceImportRead])
def list_invoice_imports(
    db: Session = Depends(get_db_session),
    _admin: str = Depends(get_current_admin),
) -> list[InvoiceImportRead]:
    imports = (
        db.query(InvoiceImport)
        .filter(InvoiceImport.status == "confirmed")
        .order_by(InvoiceImport.confirmed_at.desc())
        .all()
    )

    supplier_ids = {entry.supplier_id for entry in imports if entry.supplier_id}
    suppliers_by_id: dict[str, Supplier] = {}
    if supplier_ids:
        suppliers = db.query(Supplier).filter(Supplier.id.in_(supplier_ids)).all()
        suppliers_by_id = {supplier.id: supplier for supplier in suppliers}

    return [
        invoice_import_to_read(
            entry,
            suppliers_by_id[entry.supplier_id].name if entry.supplier_id in suppliers_by_id else None,
        )
        for entry in imports
    ]


@router.get("/{import_id}", response_model=InvoiceImportDetailRead)
def get_invoice_import(
    import_id: str,
    db: Session = Depends(get_db_session),
    _admin: str = Depends(get_current_admin),
) -> InvoiceImportDetailRead:
    invoice_import = db.get(InvoiceImport, import_id)
    if not invoice_import:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Importação não encontrada.",
        )

    supplier_name = None
    if invoice_import.supplier_id:
        supplier = db.get(Supplier, invoice_import.supplier_id)
        supplier_name = supplier.name if supplier else None

    return invoice_import_to_detail_read(invoice_import, supplier_name)


@router.post("/parse", response_model=InvoiceDraft)
async def parse_invoice(
    file: UploadFile,
    db: Session = Depends(get_db_session),
    _admin: str = Depends(get_current_admin),
) -> InvoiceDraft:
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Apenas ficheiros PDF são aceites.",
        )

    file_bytes = await file.read()
    _raw_file_hash = hashlib.sha256(file_bytes).hexdigest()

    try:
        draft = detect_and_parse(file_bytes)
    except UnsupportedInvoiceFormatError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    duplicate = (
        db.query(InvoiceImport)
        .filter(
            InvoiceImport.document_id == draft.documentId,
            InvoiceImport.status == "confirmed",
        )
        .first()
    )
    if duplicate:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Fatura {draft.documentId} já foi importada.",
        )

    return draft


@router.post("/suggest", response_model=InvoiceSuggestResponse)
def suggest_mappings(
    body: InvoiceSuggestRequest,
    db: Session = Depends(get_db_session),
    _admin: str = Depends(get_current_admin),
) -> InvoiceSuggestResponse:
    supplier_suggestions = suggest_suppliers(db, body.draft)
    item_mappings = suggest_item_mappings(db, body.draft, body.confirmedSupplierId)
    return InvoiceSuggestResponse(
        supplierSuggestions=supplier_suggestions,
        itemMappings=item_mappings,
    )


@router.post("/confirm", response_model=InvoiceConfirmResult, status_code=status.HTTP_201_CREATED)
def confirm_invoice(
    body: InvoiceConfirmRequest,
    db: Session = Depends(get_db_session),
    _admin: str = Depends(get_current_admin),
) -> InvoiceConfirmResult:
    return confirm_invoice_import(
        db,
        body.draft,
        body.confirmedSupplierId,
        body.itemMappings,
        body.options,
    )
