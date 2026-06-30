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
