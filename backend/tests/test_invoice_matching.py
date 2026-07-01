import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

import app.models  # noqa: F401
from app.database import Base
from app.models.product import Product
from app.models.product_mapping import ProductMapping
from app.models.supplier import Supplier
from app.models.supplier_alias import SupplierAlias
from app.schemas.invoice import (
    InvoiceDraft,
    InvoiceItemDraft,
    InvoiceSupplierDraft,
    InvoiceTotalsDraft,
)
from app.services.invoice_matching_service import suggest_item_mappings, suggest_suppliers
from app.services.mappers import utc_now
from app.services.text_normalization import normalize_name

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
        issueDate=utc_now(),
        supplier=InvoiceSupplierDraft(
            legalName="MAKRO CASH & CARRY PORTUGAL, S.A.",
            storeName="MAKRO BRAGA",
            taxId="502030712",
        ),
        items=list(items),
        totals=InvoiceTotalsDraft(totalIncVat=10.0),
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


def _seed_arroz_product(db: Session) -> Product:
    product = Product(
        id="arroz-agulha",
        name="Arroz",
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


def test_fuzzy_suggests_makro_without_aliases(db: Session):
    _seed_makro_supplier(db)
    draft = _makro_draft()

    suggestions = suggest_suppliers(db, draft)

    assert suggestions
    assert suggestions[0].supplierId == "makro"
    assert suggestions[0].reason == "fuzzy"
    assert suggestions[0].score >= 75


def test_tax_id_alias_scores_highest(db: Session):
    _seed_makro_supplier(db)
    db.add(
        SupplierAlias(
            supplier_id="makro",
            source_tax_id="502030712",
            source_name_normalized=normalize_name("MAKRO CASH & CARRY PORTUGAL, S.A."),
            confirmed_count=3,
        ),
    )
    db.commit()

    suggestions = suggest_suppliers(db, _makro_draft())

    assert suggestions[0].supplierId == "makro"
    assert suggestions[0].reason == "tax_id_alias"
    assert suggestions[0].score >= 100


def test_product_code_mapping_is_top_suggestion(db: Session):
    _seed_makro_supplier(db)
    _seed_arroz_product(db)
    db.add(
        ProductMapping(
            supplier_id="makro",
            external_code="5601660974707",
            external_description_normalized=normalize_name("ARROZ E.L AGULHA 1KG ARO"),
            product_id="arroz-agulha",
            confirmed_count=2,
        ),
    )
    db.commit()

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

    mappings = suggest_item_mappings(db, draft, confirmed_supplier_id="makro")

    assert len(mappings) == 1
    assert mappings[0].needsManualMapping is False
    assert mappings[0].suggestions[0].productId == "arroz-agulha"
    assert mappings[0].suggestions[0].reason == "code_mapping"
    assert mappings[0].quantity == 5
    assert mappings[0].unitCost == pytest.approx(0.97)


def test_unknown_item_needs_manual_mapping(db: Session):
    _seed_makro_supplier(db)
    item = InvoiceItemDraft(
        lineNumber=99,
        externalCode="9999999999999",
        description="PRODUTO INEXISTENTE XYZABC",
        packType="PC",
        unitPrice=1.0,
        quantity=1,
        totalPrice=1.0,
    )

    mappings = suggest_item_mappings(db, _makro_draft(item), confirmed_supplier_id="makro")

    assert mappings[0].needsManualMapping is True
    assert all(suggestion.score < 75 for suggestion in mappings[0].suggestions)


def test_confirmed_supplier_improves_product_suggestions(db: Session):
    _seed_makro_supplier(db)
    _seed_arroz_product(db)
    db.add(
        ProductMapping(
            supplier_id="makro",
            external_code="5601660974707",
            external_description_normalized=normalize_name("ARROZ E.L AGULHA 1KG ARO"),
            product_id="arroz-agulha",
            confirmed_count=2,
        ),
    )
    db.commit()

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

    without_supplier = suggest_item_mappings(db, draft, confirmed_supplier_id=None)
    with_supplier = suggest_item_mappings(db, draft, confirmed_supplier_id="makro")

    assert without_supplier[0].needsManualMapping is True
    assert with_supplier[0].needsManualMapping is False
    assert with_supplier[0].suggestions[0].reason == "code_mapping"
    assert with_supplier[0].suggestions[0].score > max(
        (suggestion.score for suggestion in without_supplier[0].suggestions),
        default=0,
    )


def test_kg_item_uses_weight_for_quantity(db: Session):
    item = InvoiceItemDraft(
        lineNumber=12,
        externalCode="2862319010891",
        description="ASAS FRANGO CUV FAMILIAR",
        packType="KG",
        unitPrice=3.47,
        quantity=1,
        totalPrice=3.47,
        weightKg=1.089,
    )

    mappings = suggest_item_mappings(db, _makro_draft(item), confirmed_supplier_id=None)

    assert mappings[0].quantity == pytest.approx(1.089)
    assert mappings[0].unitCost == pytest.approx(3.47 / 1.089)
    assert mappings[0].packType == "KG"
