from datetime import UTC, date, datetime

from app.models.checklist import ChecklistCompletion, ChecklistItem, ChecklistTemplate
from app.models.invoice_import import InvoiceImport
from app.models.menu import MenuCategory, MenuSubcategory
from app.models.payable import Payable
from app.models.product import Product, RecipeLine
from app.models.purchase import PurchaseRecord
from app.models.sale import Sale, SaleItem
from app.models.settings import AppSettings
from app.models.stock import StockMovement
from app.models.supplier import Supplier
from app.models.table import RestaurantTable, TableOrderItem
from app.schemas.checklist import (
    ChecklistCompletionRead,
    ChecklistItemRead,
    ChecklistTemplateRead,
)
from app.schemas.invoice import InvoiceImportDetailRead, InvoiceImportRead
from app.schemas.menu import MenuCategoryRead, MenuSubcategoryRead
from app.schemas.payable import PayableRead
from app.schemas.product import ProductRead, RecipeLineRead
from app.schemas.purchase import PurchaseRecordRead
from app.schemas.sale import SaleItemRead, SaleRead
from app.schemas.settings import AppSettingsRead
from app.schemas.stock import StockMovementRead
from app.schemas.supplier import SupplierRead
from app.schemas.table import TableOrderItemRead, TableRead, TableWithDetailsRead


def movement_to_read(movement: StockMovement) -> StockMovementRead:
    return StockMovementRead(
        id=movement.id,
        productId=movement.product_id,
        productName=movement.product_name,
        type=movement.type,
        delta=movement.delta,
        quantityAfter=movement.quantity_after,
        referenceId=movement.reference_id,
        reason=movement.reason,
        supplierId=movement.supplier_id,
        unitCost=movement.unit_cost,
        purchaseRecordId=movement.purchase_record_id,
        createdAt=movement.created_at,
    )


def recipe_line_to_read(line: RecipeLine) -> RecipeLineRead:
    return RecipeLineRead(
        ingredientId=line.ingredient_id,
        quantity=line.quantity,
        unit=line.unit,
    )


def product_to_read(product: Product) -> ProductRead:
    recipe = [recipe_line_to_read(line) for line in product.recipe_lines] if product.recipe_lines else None
    return ProductRead(
        id=product.id,
        name=product.name,
        price=product.price,
        category=product.category,
        subcategory=product.subcategory,
        kind=product.kind,
        recipe=recipe if recipe else None,
        trackStock=product.track_stock,
        stockQuantity=product.stock_quantity,
        minStock=product.min_stock,
        stockUnit=product.stock_unit,
        packageSize=product.package_size,
        packageUnit=product.package_unit,
        lastPurchaseCost=product.last_purchase_cost,
        preferredSupplierId=product.preferred_supplier_id,
    )


def supplier_to_read(supplier: Supplier) -> SupplierRead:
    return SupplierRead(
        id=supplier.id,
        name=supplier.name,
        taxId=supplier.tax_id,
        tradeName=supplier.trade_name,
        legalName=supplier.legal_name,
        contactName=supplier.contact_name,
        email=supplier.email,
        phone=supplier.phone,
        notes=supplier.notes,
        createdAt=supplier.created_at,
    )


def subcategory_to_read(sub: MenuSubcategory) -> MenuSubcategoryRead:
    return MenuSubcategoryRead(id=sub.id, name=sub.name)


def category_to_read(category: MenuCategory) -> MenuCategoryRead:
    return MenuCategoryRead(
        id=category.id,
        name=category.name,
        subcategories=[subcategory_to_read(sub) for sub in category.subcategories],
    )


def order_item_to_read(item: TableOrderItem) -> TableOrderItemRead:
    return TableOrderItemRead(productId=item.product_id, quantity=item.quantity)


def table_to_read(table: RestaurantTable, total: float = 0, item_count: int = 0) -> TableRead:
    return TableRead(
        id=table.id,
        number=table.number,
        category=table.category,
        status=table.status,
        items=[order_item_to_read(item) for item in table.order_items],
        openedAt=table.opened_at,
    )


def table_with_details(table: RestaurantTable, products: list[Product]) -> TableWithDetailsRead:
    product_map = {product.id: product for product in products}
    total = 0.0
    item_count = 0
    for item in table.order_items:
        product = product_map.get(item.product_id)
        if product:
            total += product.price * item.quantity
        item_count += item.quantity

    base = table_to_read(table, total, item_count)
    return TableWithDetailsRead(**base.model_dump(), total=total, itemCount=item_count)


def sale_item_to_read(item: SaleItem) -> SaleItemRead:
    return SaleItemRead(
        productId=item.product_id,
        productName=item.product_name,
        quantity=item.quantity,
        unitPrice=item.unit_price,
        subtotal=item.subtotal,
    )


def sale_to_read(sale: Sale) -> SaleRead:
    return SaleRead(
        id=sale.id,
        tableNumber=sale.table_number,
        openedAt=sale.opened_at,
        paidAt=sale.paid_at,
        paymentMethod=sale.payment_method,
        amountReceived=sale.amount_received,
        change=sale.change,
        total=sale.total,
        items=[sale_item_to_read(item) for item in sale.items],
        description=sale.description,
        source=sale.source,
        adjustmentReason=sale.adjustment_reason,
    )


def purchase_to_read(record: PurchaseRecord) -> PurchaseRecordRead:
    return PurchaseRecordRead(
        id=record.id,
        productId=record.product_id,
        productName=record.product_name,
        supplierId=record.supplier_id,
        supplierName=record.supplier_name,
        unitCost=record.unit_cost,
        quantity=record.quantity,
        totalCost=record.total_cost,
        purchasedAt=record.purchased_at,
        notes=record.notes,
        stockMovementId=record.stock_movement_id,
    )


def invoice_import_to_read(
    invoice_import: InvoiceImport,
    supplier_name: str | None = None,
) -> InvoiceImportRead:
    return InvoiceImportRead(
        id=invoice_import.id,
        template=invoice_import.template,
        documentId=invoice_import.document_id,
        invoiceNumber=invoice_import.invoice_number,
        supplierId=invoice_import.supplier_id,
        supplierName=supplier_name,
        issueDate=invoice_import.issue_date,
        totalIncVat=invoice_import.total_inc_vat,
        currency=invoice_import.currency,
        status=invoice_import.status,
        itemCount=invoice_import.item_count,
        confirmedAt=invoice_import.confirmed_at,
    )


def invoice_import_to_detail_read(
    invoice_import: InvoiceImport,
    supplier_name: str | None = None,
) -> InvoiceImportDetailRead:
    base = invoice_import_to_read(invoice_import, supplier_name)
    return InvoiceImportDetailRead(
        **base.model_dump(),
        purchaseIds=invoice_import.purchase_ids or [],
        payableId=invoice_import.payable_id,
        subtotalExVat=invoice_import.subtotal_ex_vat,
    )


def payable_to_read(payable: Payable) -> PayableRead:
    due = payable.due_date
    due_str = due.isoformat() if isinstance(due, date) else str(due)
    return PayableRead(
        id=payable.id,
        categoryId=payable.category_id,
        description=payable.description,
        supplierId=payable.supplier_id,
        amount=payable.amount,
        dueDate=due_str,
        recurrence=payable.recurrence,
        status=payable.status,
        paidAt=payable.paid_at,
        paidAmount=payable.paid_amount,
        notes=payable.notes,
        createdAt=payable.created_at,
    )


def checklist_template_to_read(template: ChecklistTemplate) -> ChecklistTemplateRead:
    return ChecklistTemplateRead(
        id=template.id,
        type=template.type,
        title=template.title,
        timeWindowStart=template.time_window_start,
        timeWindowEnd=template.time_window_end,
        sortOrder=template.sort_order,
        active=template.active,
    )


def checklist_item_to_read(item: ChecklistItem) -> ChecklistItemRead:
    days = item.days_of_week if item.days_of_week is not None else "all"
    return ChecklistItemRead(
        id=item.id,
        templateId=item.template_id,
        label=item.label,
        sortOrder=item.sort_order,
        daysOfWeek=days,
        active=item.active,
    )


def completion_to_read(completion: ChecklistCompletion) -> ChecklistCompletionRead:
    return ChecklistCompletionRead(
        id=completion.id,
        dateKey=completion.date_key,
        itemId=completion.item_id,
        completedAt=completion.completed_at,
    )


def settings_to_read(settings: AppSettings) -> AppSettingsRead:
    return AppSettingsRead(currency=settings.currency)


def utc_now() -> datetime:
    return datetime.now(UTC)
