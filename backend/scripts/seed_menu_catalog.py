#!/usr/bin/env python3
"""Reset and seed menu catalog directly in the database."""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy.orm import Session

from app.data.menu_catalog import MENU_CATALOG, create_id, iter_catalog_products
from app.database import SessionLocal
from app.models.enums import ProductKind
from app.models.menu import MenuCategory, MenuSubcategory
from app.models.product import Product, RecipeLine
from app.models.table import TableOrderItem


def _clear_menu_data(db: Session) -> None:
    db.query(RecipeLine).delete(synchronize_session=False)
    db.query(TableOrderItem).delete(synchronize_session=False)
    db.query(Product).delete(synchronize_session=False)
    db.query(MenuSubcategory).delete(synchronize_session=False)
    db.query(MenuCategory).delete(synchronize_session=False)
    db.commit()


def _seed_menu_data(db: Session) -> tuple[int, int, int]:
    category_count = 0
    subcategory_count = 0
    product_count = 0

    for category_data in MENU_CATALOG:
        category = MenuCategory(
            id=create_id("cat", category_data.name),
            name=category_data.name,
        )
        db.add(category)
        category_count += 1

        for subcategory_data in category_data.subcategories:
            subcategory = MenuSubcategory(
                id=create_id("sub", f"{category_data.name}-{subcategory_data.name}"),
                category_id=category.id,
                name=subcategory_data.name,
            )
            db.add(subcategory)
            subcategory_count += 1

    for product_id, name, category_name, subcategory_name, price in iter_catalog_products():
        db.add(
            Product(
                id=product_id,
                name=name,
                price=price,
                category=category_name,
                subcategory=subcategory_name,
                kind=ProductKind.MENU,
                track_stock=False,
                stock_quantity=0,
                min_stock=0,
            ),
        )
        product_count += 1

    db.commit()
    return category_count, subcategory_count, product_count


def main() -> None:
    db = SessionLocal()
    try:
        _clear_menu_data(db)
        categories, subcategories, products = _seed_menu_data(db)
        print(
            f"Catálogo atualizado: {categories} categorias, "
            f"{subcategories} subcategorias, {products} produtos.",
        )
    finally:
        db.close()


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(error, file=sys.stderr)
        sys.exit(1)
