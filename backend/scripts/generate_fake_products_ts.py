#!/usr/bin/env python3
"""Generate frontend fakeProducts.ts from menu catalog data."""

from __future__ import annotations

import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.data.menu_catalog import iter_catalog_products

OUTPUT = Path(__file__).resolve().parents[2] / "frontend/src/features/tables/data/fakeProducts.ts"


def _escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace('"', '\\"')


def main() -> None:
    lines = [
        'import { normalizeProducts } from "@/features/stock/utils/productStock";',
        "",
        'import type { Product } from "../types";',
        "",
        "type ProductSeed = Omit<",
        "  Product,",
        '  "trackStock" | "stockQuantity" | "minStock" | "kind" | "recipe" | "stockUnit" | "packageSize" | "packageUnit"',
        ">;",
        "",
        "const BASE_FAKE_PRODUCTS: ProductSeed[] = [",
    ]

    for product_id, name, category, subcategory, price in iter_catalog_products():
        lines.append(
            f'  {{ id: "{product_id}", name: "{_escape(name)}", price: {price:.2f}, '
            f'category: "{_escape(category)}", subcategory: "{_escape(subcategory)}" }},',
        )

    lines.extend(
        [
            "];",
            "",
            "export const FAKE_PRODUCTS: Product[] = normalizeProducts(",
            "  BASE_FAKE_PRODUCTS as Product[],",
            ");",
            "",
            "export function getCategories(): string[] {",
            "  return [...new Set(FAKE_PRODUCTS.map((product) => product.category))];",
            "}",
            "",
            "export function getSubcategories(category: string): string[] {",
            "  return [",
            "    ...new Set(",
            "      FAKE_PRODUCTS.filter((product) => product.category === category).map(",
            "        (product) => product.subcategory,",
            "      ),",
            "    ),",
            "  ];",
            "}",
            "",
            "export function getProductsByCategoryAndSubcategory(",
            "  category: string,",
            "  subcategory: string,",
            "): Product[] {",
            "  return FAKE_PRODUCTS.filter(",
            "    (product) =>",
            "      product.category === category && product.subcategory === subcategory,",
            "  );",
            "}",
            "",
        ],
    )

    OUTPUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"Gerado {OUTPUT} com {len(list(iter_catalog_products()))} produtos.")


if __name__ == "__main__":
    main()
