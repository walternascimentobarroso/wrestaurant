import uuid
from datetime import timedelta

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.enums import PayableRecurrence, PayableStatus
from app.models.invoice_import import InvoiceImport
from app.models.payable import Payable, PayableCategory
from app.models.product import Product
from app.models.product_mapping import ProductMapping
from app.models.supplier import Supplier
from app.models.supplier_alias import SupplierAlias
from app.schemas.invoice import (
    ConfirmedItemMapping,
    InvoiceConfirmOptions,
    InvoiceConfirmResult,
    InvoiceDraft,
    InvoiceItemDraft,
)
from app.schemas.purchase import PurchaseCreate
from app.services.mappers import utc_now
from app.services.purchase_service import record_purchase
from app.services.text_normalization import normalize_name, normalize_tax_id

DEFAULT_PAYABLE_CATEGORY_ID = "suppliers"
PAYABLE_DUE_DAYS = 30


def confirm_invoice_import(
    db: Session,
    draft: InvoiceDraft,
    confirmed_supplier_id: str,
    item_mappings: list[ConfirmedItemMapping],
    options: InvoiceConfirmOptions,
) -> InvoiceConfirmResult:
    existing = (
        db.query(InvoiceImport)
        .filter(
            InvoiceImport.document_id == draft.documentId,
            InvoiceImport.status == "confirmed",
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Fatura {draft.documentId} já foi importada.",
        )

    supplier = db.get(Supplier, confirmed_supplier_id)
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Fornecedor não encontrado.",
        )

    if not item_mappings:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Informe pelo menos um item mapeado.",
        )

    for mapping in item_mappings:
        if not mapping.productId.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cada item confirmado deve ter um produto associado.",
            )
        product = db.get(Product, mapping.productId)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Produto não encontrado: {mapping.productId}.",
            )

    items_skipped = max(len(draft.items) - len(item_mappings), 0)
    draft_items_by_line = {item.lineNumber: item for item in draft.items}
    purchase_notes = options.notes.strip() if options.notes else f"Importação {draft.documentId}"

    try:
        invoice_import_id = str(uuid.uuid4())
        now = utc_now()

        invoice_import = InvoiceImport(
            id=invoice_import_id,
            template=draft.template,
            document_id=draft.documentId,
            invoice_number=draft.invoiceNumber,
            supplier_id=confirmed_supplier_id,
            issue_date=draft.issueDate,
            subtotal_ex_vat=draft.totals.subtotalExVat,
            total_inc_vat=draft.totals.totalIncVat,
            currency=draft.totals.currency,
            status="confirmed",
            raw_file_hash=options.rawFileHash,
            item_count=len(item_mappings),
            confirmed_at=now,
            purchase_ids=[],
        )
        db.add(invoice_import)
        db.flush()

        purchase_ids: list[str] = []
        for mapping in item_mappings:
            purchase = record_purchase(
                db,
                PurchaseCreate(
                    productId=mapping.productId,
                    supplierId=confirmed_supplier_id,
                    unitCost=mapping.unitCost,
                    quantity=mapping.quantity,
                    purchasedAt=options.purchasedAt,
                    notes=purchase_notes,
                ),
            )
            purchase_ids.append(purchase.id)

        _upsert_supplier_alias(db, confirmed_supplier_id, draft)

        for mapping in item_mappings:
            draft_item = draft_items_by_line.get(mapping.lineNumber)
            if draft_item is not None:
                _upsert_product_mapping(
                    db,
                    confirmed_supplier_id,
                    draft_item,
                    mapping.productId,
                )

        if not supplier.tax_id and draft.supplier.taxId:
            supplier.tax_id = normalize_tax_id(draft.supplier.taxId)

        payable_id = None
        if options.createPayable:
            payable_id = _create_payable(
                db,
                draft,
                supplier,
                confirmed_supplier_id,
                options,
            )
            invoice_import.payable_id = payable_id

        invoice_import.purchase_ids = purchase_ids
        db.commit()

        return InvoiceConfirmResult(
            invoiceImportId=invoice_import_id,
            purchaseIds=purchase_ids,
            payableId=payable_id,
            itemsImported=len(item_mappings),
            itemsSkipped=items_skipped,
        )
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não foi possível confirmar a importação.",
        ) from exc


def _upsert_supplier_alias(
    db: Session,
    supplier_id: str,
    draft: InvoiceDraft,
) -> None:
    tax_id = normalize_tax_id(draft.supplier.taxId)
    name_normalized = normalize_name(draft.supplier.legalName)
    store_normalized = (
        normalize_name(draft.supplier.storeName) if draft.supplier.storeName else None
    )

    query = db.query(SupplierAlias).filter(
        SupplierAlias.supplier_id == supplier_id,
        SupplierAlias.source_name_normalized == name_normalized,
    )
    if store_normalized:
        query = query.filter(SupplierAlias.source_store_name == store_normalized)
    else:
        query = query.filter(SupplierAlias.source_store_name.is_(None))

    existing = query.first()
    now = utc_now()

    if existing:
        existing.source_tax_id = tax_id
        existing.confirmed_count += 1
        existing.last_confirmed_at = now
        return

    db.add(
        SupplierAlias(
            supplier_id=supplier_id,
            source_tax_id=tax_id,
            source_name_normalized=name_normalized,
            source_store_name=store_normalized,
            confirmed_count=1,
            last_confirmed_at=now,
        ),
    )


def _upsert_product_mapping(
    db: Session,
    supplier_id: str,
    draft_item: InvoiceItemDraft,
    product_id: str,
) -> None:
    description_normalized = normalize_name(draft_item.description)
    now = utc_now()

    query = db.query(ProductMapping).filter(
        ProductMapping.supplier_id == supplier_id,
        ProductMapping.external_description_normalized == description_normalized,
    )
    if draft_item.externalCode:
        query = query.filter(ProductMapping.external_code == draft_item.externalCode)
    else:
        query = query.filter(ProductMapping.external_code.is_(None))

    existing = query.first()
    if existing:
        existing.product_id = product_id
        existing.confirmed_count += 1
        existing.last_confirmed_at = now
        return

    db.add(
        ProductMapping(
            supplier_id=supplier_id,
            external_code=draft_item.externalCode,
            external_description_normalized=description_normalized,
            product_id=product_id,
            confirmed_count=1,
            last_confirmed_at=now,
        ),
    )


def _create_payable(
    db: Session,
    draft: InvoiceDraft,
    supplier: Supplier,
    supplier_id: str,
    options: InvoiceConfirmOptions,
) -> str:
    category_id = options.payableCategoryId or DEFAULT_PAYABLE_CATEGORY_ID
    category = db.get(PayableCategory, category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Categoria de conta a pagar inválida.",
        )

    purchased_date = options.purchasedAt.date()
    due_date = purchased_date + timedelta(days=PAYABLE_DUE_DAYS)
    invoice_label = draft.invoiceNumber or draft.documentId

    payable = Payable(
        id=f"payable-{uuid.uuid4()}",
        category_id=category_id,
        description=f"Fatura {invoice_label} — {supplier.name}",
        supplier_id=supplier_id,
        amount=draft.totals.totalIncVat,
        due_date=due_date,
        recurrence=PayableRecurrence.NONE,
        status=PayableStatus.PENDING,
        notes=options.notes,
        created_at=utc_now(),
    )
    db.add(payable)
    db.flush()
    return payable.id
