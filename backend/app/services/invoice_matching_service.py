from collections.abc import Iterable
from datetime import UTC, datetime, timedelta

from rapidfuzz import fuzz
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.product_mapping import ProductMapping
from app.models.purchase import PurchaseRecord
from app.models.supplier import Supplier
from app.models.supplier_alias import SupplierAlias
from app.schemas.invoice import (
    InvoiceDraft,
    InvoiceItemDraft,
    ItemMappingSuggestion,
    ProductSuggestion,
    SupplierSuggestion,
)
from app.services.text_normalization import normalize_name, normalize_tax_id

FUZZY_THRESHOLD = 75
TOP_SUGGESTIONS = 5
PURCHASE_HISTORY_DAYS = 90

_CODE_MAPPING_BASE_SCORE = 100.0
_DESCRIPTION_MAPPING_BASE_SCORE = 95.0
_PURCHASE_HISTORY_BASE_SCORE = 70.0
_SUPPLIER_PURCHASE_HISTORY_BASE_SCORE = 60.0


def suggest_suppliers(db: Session, draft: InvoiceDraft) -> list[SupplierSuggestion]:
    tax_id = normalize_tax_id(draft.supplier.taxId)
    name_normalized = normalize_name(draft.supplier.legalName)
    store_normalized = (
        normalize_name(draft.supplier.storeName) if draft.supplier.storeName else None
    )
    search_text = _draft_supplier_search_text(draft)

    bucket: dict[str, SupplierSuggestion] = {}

    for alias in db.query(SupplierAlias).filter(SupplierAlias.source_tax_id == tax_id):
        supplier = db.get(Supplier, alias.supplier_id)
        if supplier:
            _upsert_supplier_suggestion(bucket, supplier, 100.0, "tax_id_alias")

    for supplier in db.query(Supplier).filter(Supplier.tax_id == tax_id):
        _upsert_supplier_suggestion(bucket, supplier, 98.0, "tax_id_exact")

    alias_query = db.query(SupplierAlias).filter(
        SupplierAlias.source_name_normalized == name_normalized,
    )
    if store_normalized:
        alias_query = alias_query.filter(
            (SupplierAlias.source_store_name == store_normalized)
            | (SupplierAlias.source_store_name.is_(None)),
        )
    for alias in alias_query:
        supplier = db.get(Supplier, alias.supplier_id)
        if supplier:
            score = 90.0 + min(alias.confirmed_count, 10)
            _upsert_supplier_suggestion(bucket, supplier, score, "name_alias")

    for supplier in db.query(Supplier):
        ratio = _best_supplier_name_ratio(search_text, supplier)
        if ratio >= FUZZY_THRESHOLD:
            _upsert_supplier_suggestion(bucket, supplier, float(ratio), "fuzzy")

    cutoff = datetime.now(UTC) - timedelta(days=PURCHASE_HISTORY_DAYS)
    purchase_counts = (
        db.query(PurchaseRecord.supplier_id, func.count(PurchaseRecord.id))
        .filter(PurchaseRecord.purchased_at >= cutoff)
        .group_by(PurchaseRecord.supplier_id)
        .all()
    )
    for supplier_id, _count in purchase_counts:
        supplier = db.get(Supplier, supplier_id)
        if not supplier:
            continue
        ratio = _best_supplier_name_ratio(search_text, supplier)
        if ratio < FUZZY_THRESHOLD:
            continue
        score = _SUPPLIER_PURCHASE_HISTORY_BASE_SCORE + ratio * 0.3
        _upsert_supplier_suggestion(bucket, supplier, score, "purchase_history")

    return _top_suggestions(bucket.values(), TOP_SUGGESTIONS)


def suggest_item_mappings(
    db: Session,
    draft: InvoiceDraft,
    confirmed_supplier_id: str | None,
) -> list[ItemMappingSuggestion]:
    stock_products = (
        db.query(Product).filter(Product.track_stock.is_(True)).order_by(Product.name).all()
    )
    product_by_id = {product.id: product for product in stock_products}

    return [
        _suggest_item_mapping(db, item, confirmed_supplier_id, stock_products, product_by_id)
        for item in draft.items
    ]


def _suggest_item_mapping(
    db: Session,
    item: InvoiceItemDraft,
    confirmed_supplier_id: str | None,
    stock_products: list[Product],
    product_by_id: dict[str, Product],
) -> ItemMappingSuggestion:
    description_normalized = normalize_name(item.description)
    bucket: dict[str, ProductSuggestion] = {}

    if confirmed_supplier_id:
        mapping_query = db.query(ProductMapping).filter(
            ProductMapping.supplier_id == confirmed_supplier_id,
        )

        if item.externalCode:
            for mapping in mapping_query.filter(ProductMapping.external_code == item.externalCode):
                product = product_by_id.get(mapping.product_id)
                if product:
                    score = _CODE_MAPPING_BASE_SCORE + min(mapping.confirmed_count, 10)
                    _upsert_product_suggestion(bucket, product, score, "code_mapping")

        for mapping in mapping_query.filter(
            ProductMapping.external_description_normalized == description_normalized,
        ):
            product = product_by_id.get(mapping.product_id)
            if product:
                score = _DESCRIPTION_MAPPING_BASE_SCORE + min(mapping.confirmed_count, 10)
                _upsert_product_suggestion(bucket, product, score, "description_mapping")

        purchases = (
            db.query(PurchaseRecord)
            .filter(PurchaseRecord.supplier_id == confirmed_supplier_id)
            .order_by(PurchaseRecord.purchased_at.desc())
            .all()
        )
        seen_products: set[str] = set()
        for purchase in purchases:
            if purchase.product_id in seen_products:
                continue
            seen_products.add(purchase.product_id)
            ratio = fuzz.token_set_ratio(item.description, purchase.product_name)
            if ratio < FUZZY_THRESHOLD:
                continue
            product = product_by_id.get(purchase.product_id)
            if product:
                score = _PURCHASE_HISTORY_BASE_SCORE + ratio * 0.3
                _upsert_product_suggestion(bucket, product, score, "purchase_history")

    for product in stock_products:
        ratio = fuzz.token_set_ratio(item.description, product.name)
        if ratio >= FUZZY_THRESHOLD:
            _upsert_product_suggestion(bucket, product, float(ratio), "fuzzy")

    suggestions = _top_suggestions(bucket.values(), TOP_SUGGESTIONS)
    quantity, unit_cost = _item_quantity_and_cost(item)
    best_score = max((suggestion.score for suggestion in suggestions), default=0.0)

    return ItemMappingSuggestion(
        lineNumber=item.lineNumber,
        draftItem=item,
        suggestions=suggestions,
        needsManualMapping=best_score < FUZZY_THRESHOLD,
        quantity=quantity,
        unitCost=unit_cost,
        packType=item.packType,
    )


def _draft_supplier_search_text(draft: InvoiceDraft) -> str:
    parts = [draft.supplier.legalName]
    if draft.supplier.storeName:
        parts.append(draft.supplier.storeName)
    return " ".join(parts)


def _best_supplier_name_ratio(search_text: str, supplier: Supplier) -> float:
    candidates = [supplier.name]
    if supplier.legal_name:
        candidates.append(supplier.legal_name)
    if supplier.trade_name:
        candidates.append(supplier.trade_name)
    return max(fuzz.token_set_ratio(search_text, candidate) for candidate in candidates)


def _item_quantity_and_cost(item: InvoiceItemDraft) -> tuple[float, float]:
    if item.packType == "KG" and item.weightKg is not None and item.weightKg > 0:
        return item.weightKg, item.totalPrice / item.weightKg
    if item.quantity > 0:
        return item.quantity, item.totalPrice / item.quantity
    return item.quantity, item.unitPrice


def _upsert_supplier_suggestion(
    bucket: dict[str, SupplierSuggestion],
    supplier: Supplier,
    score: float,
    reason: str,
) -> None:
    existing = bucket.get(supplier.id)
    if existing is not None and existing.score >= score:
        return
    bucket[supplier.id] = SupplierSuggestion(
        supplierId=supplier.id,
        supplierName=supplier.name,
        score=score,
        reason=reason,
    )


def _upsert_product_suggestion(
    bucket: dict[str, ProductSuggestion],
    product: Product,
    score: float,
    reason: str,
) -> None:
    existing = bucket.get(product.id)
    if existing is not None and existing.score >= score:
        return
    bucket[product.id] = ProductSuggestion(
        productId=product.id,
        productName=product.name,
        score=score,
        reason=reason,
    )


def _top_suggestions(suggestions: Iterable[SupplierSuggestion | ProductSuggestion], limit: int):
    ordered = sorted(suggestions, key=lambda suggestion: suggestion.score, reverse=True)
    return ordered[:limit]
