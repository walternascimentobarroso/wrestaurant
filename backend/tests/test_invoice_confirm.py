import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

import app.models  # noqa: F401
from app.database import Base
from app.models.payable import Payable
from app.models.product import Product
from app.models.purchase import PurchaseRecord
from app.models.supplier import Supplier
from app.schemas.invoice import (
    ConfirmedItemMapping,
    InvoiceConfirmOptions,
    InvoiceDraft,
    InvoiceItemDraft,
    InvoiceSupplierDraft,
    InvoiceTotalsDraft,
)
from app.services.invoice_import_service import confirm_invoice_import
from app.services.invoice_matching_service import suggest_item_mappings, suggest_suppliers
from app.services.mappers import utc_now

TEST_ENGINE = create_engine("sqlite:///:memory:")
TestSession = sessionmaker(bind=TEST_ENGINE)


@pytest.fixture
def db() -> Session:
    Base.metadata.create_all(TEST_ENGINE)
    session = TestSession()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(TEST_ENGINE)


def _makro_draft(*items: InvoiceItemDraft) -> InvoiceDraft:
    return InvoiceDraft(
        template="makro_pt",
        documentId="J6FSWPBP-023508",
        invoiceNumber="FAC 08004202601/023508",
        issueDate=utc_now(),
        supplier=InvoiceSupplierDraft(
            legalName="MAKRO CASH & CARRY PORTUGAL, S.A.",
            storeName="MAKRO BRAGA",
            taxId="502030712",
        ),
        items=list(items),
        totals=InvoiceTotalsDraft(subtotalExVat=10.0, totalIncVat=153.69),
    )


def _seed_makro_supplier(db: Session) -> Supplier:
    supplier = Supplier(
        id="makro",
        name="MAKRO Braga",
        tax_id="502030712",
        legal_name="MAKRO CASH & CARRY PORTUGAL, S.A.",
        created_at=utc_now(),
    )
    db.add(supplier)
    db.commit()
    return supplier


def _seed_product(db: Session, product_id: str, name: str) -> Product:
    product = Product(
        id=product_id,
        name=name,
        price=0,
        category="ingredientes",
        subcategory="graos",
        kind="ingredient",
        track_stock=True,
        stock_unit="kg",
    )
    db.add(product)
    db.commit()
    return product


def _sample_items() -> list[InvoiceItemDraft]:
    return [
        InvoiceItemDraft(
            lineNumber=1,
            externalCode="5054563288622",
            description="DENT.C.DIARIO 75M PARODONTAX",
            packType="PC",
            unitPrice=3.37,
            quantity=1,
            totalPrice=3.37,
        ),
        InvoiceItemDraft(
            lineNumber=2,
            externalCode="8414892329323",
            description="MC PAO BURG BRIOCHE MANT. 330G",
            packType="PC",
            unitPrice=1.7,
            quantity=1,
            totalPrice=1.7,
        ),
        InvoiceItemDraft(
            lineNumber=3,
            externalCode="5603722493942",
            description="#MANT C/S COV 250GR PRIMOR",
            packType="CA",
            unitPrice=1.94,
            quantity=1,
            totalPrice=1.94,
        ),
    ]


def _confirm_options() -> InvoiceConfirmOptions:
    return InvoiceConfirmOptions(purchasedAt=utc_now(), notes="Teste importação")


def test_confirm_creates_three_purchases(db: Session):
    _seed_makro_supplier(db)
    _seed_product(db, "prod-1", "Produto 1")
    _seed_product(db, "prod-2", "Produto 2")
    _seed_product(db, "prod-3", "Produto 3")

    items = _sample_items()
    draft = _makro_draft(*items)
    mappings = [
        ConfirmedItemMapping(
            lineNumber=item.lineNumber,
            productId=f"prod-{index}",
            quantity=item.quantity,
            unitCost=item.unitPrice,
            action="map",
        )
        for index, item in enumerate(items, start=1)
    ]

    result = confirm_invoice_import(db, draft, "makro", mappings, _confirm_options())

    assert result.itemsImported == 3
    assert len(result.purchaseIds) == 3
    assert db.query(PurchaseRecord).count() == 3


def test_reconfirm_same_document_raises_conflict(db: Session):
    _seed_makro_supplier(db)
    _seed_product(db, "prod-1", "Produto 1")

    items = [_sample_items()[0]]
    draft = _makro_draft(*items)
    mappings = [
        ConfirmedItemMapping(
            lineNumber=1,
            productId="prod-1",
            quantity=1,
            unitCost=3.37,
            action="map",
        ),
    ]

    confirm_invoice_import(db, draft, "makro", mappings, _confirm_options())

    with pytest.raises(HTTPException) as exc_info:
        confirm_invoice_import(db, draft, "makro", mappings, _confirm_options())

    assert exc_info.value.status_code == 409


def test_confirm_creates_supplier_alias_for_second_suggest(db: Session):
    _seed_makro_supplier(db)
    _seed_product(db, "prod-1", "Produto 1")

    items = [_sample_items()[0]]
    draft = _makro_draft(*items)
    mappings = [
        ConfirmedItemMapping(
            lineNumber=1,
            productId="prod-1",
            quantity=1,
            unitCost=3.37,
            action="map",
        ),
    ]

    before = suggest_suppliers(db, draft)
    confirm_invoice_import(db, draft, "makro", mappings, _confirm_options())
    after = suggest_suppliers(db, draft)

    assert before[0].reason == "fuzzy"
    assert after[0].reason == "tax_id_alias"
    assert after[0].score >= 100


def test_confirm_creates_product_mapping_for_second_suggest(db: Session):
    _seed_makro_supplier(db)
    _seed_product(db, "arroz-agulha", "Arroz")

    item = InvoiceItemDraft(
        lineNumber=19,
        externalCode="5601660974707",
        description="ARROZ E.L AGULHA 1KG ARO",
        packType="PC",
        unitPrice=0.97,
        quantity=5,
        totalPrice=4.85,
    )
    draft = _makro_draft(item)
    mappings = [
        ConfirmedItemMapping(
            lineNumber=19,
            productId="arroz-agulha",
            quantity=5,
            unitCost=0.97,
            action="map",
        ),
    ]

    before = suggest_item_mappings(db, draft, confirmed_supplier_id="makro")
    confirm_invoice_import(db, draft, "makro", mappings, _confirm_options())
    after = suggest_item_mappings(db, draft, confirmed_supplier_id="makro")

    assert before[0].needsManualMapping is True
    assert after[0].needsManualMapping is False
    assert after[0].suggestions[0].productId == "arroz-agulha"
    assert after[0].suggestions[0].reason == "code_mapping"


def test_confirm_with_payable_creates_payable(db: Session):
    from app.models.payable import PayableCategory

    _seed_makro_supplier(db)
    _seed_product(db, "prod-1", "Produto 1")
    db.add(PayableCategory(id="suppliers", name="Fornecedores"))
    db.commit()

    items = [_sample_items()[0]]
    draft = _makro_draft(*items)
    mappings = [
        ConfirmedItemMapping(
            lineNumber=1,
            productId="prod-1",
            quantity=1,
            unitCost=3.37,
            action="map",
        ),
    ]
    options = InvoiceConfirmOptions(
        purchasedAt=utc_now(),
        createPayable=True,
        payableCategoryId="suppliers",
    )

    result = confirm_invoice_import(db, draft, "makro", mappings, options)

    assert result.payableId is not None
    payable = db.get(Payable, result.payableId)
    assert payable is not None
    assert payable.amount == pytest.approx(153.69)
    assert payable.supplier_id == "makro"
