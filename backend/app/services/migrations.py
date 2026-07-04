"""Lightweight SQL migrations (no Alembic)."""

from sqlalchemy import inspect, text

from app.database import engine

_UPDATED_AT_COLUMNS: list[tuple[str, str | None]] = [
    ("restaurant_tables", "opened_at"),
    ("table_order_items", None),
    ("products", None),
    ("sales", "paid_at"),
    ("payables", "created_at"),
    ("suppliers", "created_at"),
    ("purchase_records", "purchased_at"),
    ("stock_movements", "created_at"),
    ("invoice_imports", "confirmed_at"),
    ("checklist_templates", None),
    ("checklist_items", None),
    ("checklist_completions", "completed_at"),
    ("app_settings", None),
    ("menu_categories", None),
    ("menu_subcategories", None),
]


def migrate_updated_at_columns() -> None:
    inspector = inspect(engine)
    with engine.begin() as conn:
        for table, fallback_column in _UPDATED_AT_COLUMNS:
            if table not in inspector.get_table_names():
                continue

            columns = {column["name"] for column in inspector.get_columns(table)}
            if "updated_at" in columns:
                continue

            conn.execute(
                text(
                    f"ALTER TABLE {table} "
                    "ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
                ),
            )

            if fallback_column is not None:
                conn.execute(
                    text(
                        f"UPDATE {table} "
                        f"SET updated_at = COALESCE({fallback_column}, NOW())",
                    ),
                )


def migrate_sale_opened_at() -> None:
    """Persist table session start on sales for peak-hour reporting."""
    inspector = inspect(engine)
    if "sales" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("sales")}
    if "opened_at" in columns:
        return

    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE sales ADD COLUMN opened_at TIMESTAMPTZ"))


def migrate_sale_source_columns() -> None:
    """Track sale origin and manual correction reason."""
    inspector = inspect(engine)
    if "sales" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("sales")}
    with engine.begin() as conn:
        if "source" not in columns:
            conn.execute(
                text(
                    "ALTER TABLE sales "
                    "ADD COLUMN source VARCHAR(16) NOT NULL DEFAULT 'table'",
                ),
            )
        if "adjustment_reason" not in columns:
            conn.execute(text("ALTER TABLE sales ADD COLUMN adjustment_reason TEXT"))


def migrate_invoice_import_foundation() -> None:
    """Add supplier tax fields and ensure invoice-import tables exist on legacy DBs."""
    inspector = inspect(engine)
    table_names = set(inspector.get_table_names())

    with engine.begin() as conn:
        if "suppliers" in table_names:
            columns = {column["name"] for column in inspector.get_columns("suppliers")}
            if "tax_id" not in columns:
                conn.execute(text("ALTER TABLE suppliers ADD COLUMN tax_id VARCHAR(32)"))
            if "trade_name" not in columns:
                conn.execute(text("ALTER TABLE suppliers ADD COLUMN trade_name VARCHAR(255)"))
            if "legal_name" not in columns:
                conn.execute(text("ALTER TABLE suppliers ADD COLUMN legal_name VARCHAR(255)"))

            conn.execute(
                text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS ix_suppliers_tax_id "
                    "ON suppliers (tax_id) WHERE tax_id IS NOT NULL",
                ),
            )

        if "invoice_imports" in table_names:
            columns = {column["name"] for column in inspector.get_columns("invoice_imports")}
            if "purchase_ids" not in columns:
                conn.execute(text("ALTER TABLE invoice_imports ADD COLUMN purchase_ids JSON"))
            if "payable_id" not in columns:
                conn.execute(
                    text(
                        "ALTER TABLE invoice_imports "
                        "ADD COLUMN payable_id VARCHAR(64) "
                        "REFERENCES payables(id) ON DELETE SET NULL",
                    ),
                )
