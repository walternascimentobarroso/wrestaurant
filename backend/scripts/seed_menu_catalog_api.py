#!/usr/bin/env python3
"""Reset and seed menu catalog via the public API (local or production)."""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from urllib.parse import quote, urljoin

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.data.menu_catalog import MENU_CATALOG, iter_catalog_products

DEFAULT_API_BASE = "https://wrestaurant.onrender.com/api"
DEFAULT_ADMIN_PASSWORD = "admin123"


def _build_url(api_base: str, path: str) -> str:
    parts = path.split("/")
    encoded = "/".join(quote(part, safe="") for part in parts)
    return urljoin(f"{api_base.rstrip('/')}/", encoded.lstrip("/"))


def request(
    api_base: str,
    method: str,
    path: str,
    token: str | None = None,
    body: dict | None = None,
) -> tuple[int, object]:
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    data = None if body is None else json.dumps(body, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        _build_url(api_base, path),
        data=data,
        headers=headers,
        method=method,
    )

    try:
        with urllib.request.urlopen(req, timeout=120) as response:
            raw = response.read().decode()
            return response.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as error:
        raw = error.read().decode()
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            payload = raw
        return error.code, payload


def login(api_base: str, password: str) -> str:
    status, payload = request(api_base, "POST", "/auth/login", body={"password": password})
    if status != 200 or not isinstance(payload, dict):
        msg = f"Login falhou ({status}): {payload}"
        raise RuntimeError(msg)
    return payload["access_token"]


def clear_catalog(api_base: str, token: str) -> None:
    status, products = request(api_base, "GET", "/products", token=token)
    if status != 200 or not isinstance(products, list):
        msg = f"Listar produtos falhou ({status}): {products}"
        raise RuntimeError(msg)

    for product in products:
        product_id = product["id"]
        delete_status, delete_payload = request(
            api_base,
            "DELETE",
            f"/products/{product_id}",
            token=token,
        )
        if delete_status != 204:
            msg = f"Excluir produto {product_id} falhou ({delete_status}): {delete_payload}"
            raise RuntimeError(msg)

    status, categories = request(api_base, "GET", "/menu/categories", token=token)
    if status != 200 or not isinstance(categories, list):
        msg = f"Listar categorias falhou ({status}): {categories}"
        raise RuntimeError(msg)

    for category in categories:
        for subcategory in category.get("subcategories", []):
            delete_status, delete_payload = request(
                api_base,
                "DELETE",
                f"/menu/subcategories/{subcategory['id']}",
                token=token,
            )
            if delete_status != 204:
                msg = (
                    f"Excluir subcategoria {subcategory['id']} falhou "
                    f"({delete_status}): {delete_payload}"
                )
                raise RuntimeError(msg)

        delete_status, delete_payload = request(
            api_base,
            "DELETE",
            f"/menu/categories/{category['id']}",
            token=token,
        )
        if delete_status != 204:
            msg = f"Excluir categoria {category['id']} falhou ({delete_status}): {delete_payload}"
            raise RuntimeError(msg)


def seed_catalog(api_base: str, token: str) -> tuple[int, int, int]:
    category_count = 0
    subcategory_count = 0
    product_count = 0

    category_ids: dict[str, str] = {}

    for category_data in MENU_CATALOG:
        status, created = request(
            api_base,
            "POST",
            "/menu/categories",
            token=token,
            body={"name": category_data.name},
        )
        if status != 201 or not isinstance(created, dict):
            msg = f"Criar categoria '{category_data.name}' falhou ({status}): {created}"
            raise RuntimeError(msg)
        category_ids[category_data.name] = created["id"]
        category_count += 1

        for subcategory_data in category_data.subcategories:
            category_id = category_ids[category_data.name]
            status, updated = request(
                api_base,
                "POST",
                f"/menu/categories/{category_id}/subcategories",
                token=token,
                body={"name": subcategory_data.name},
            )
            if status != 201 or not isinstance(updated, dict):
                msg = (
                    f"Criar subcategoria '{subcategory_data.name}' falhou "
                    f"({status}): {updated}"
                )
                raise RuntimeError(msg)
            subcategory_count += 1

    for _product_id, name, category_name, subcategory_name, price in iter_catalog_products():
        status, payload = request(
            api_base,
            "POST",
            "/products",
            token=token,
            body={
                "name": name,
                "price": price,
                "category": category_name,
                "subcategory": subcategory_name,
                "kind": "menu",
                "trackStock": False,
                "stockQuantity": 0,
                "minStock": 0,
            },
        )
        if status != 201:
            msg = f"Criar produto '{name}' falhou ({status}): {payload}"
            raise RuntimeError(msg)
        product_count += 1

    return category_count, subcategory_count, product_count


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed menu catalog via API")
    parser.add_argument(
        "--api-base",
        default=os.environ.get("API_BASE", DEFAULT_API_BASE),
        help=f"API base URL (default: {DEFAULT_API_BASE})",
    )
    parser.add_argument(
        "--password",
        default=os.environ.get("ADMIN_PASSWORD", DEFAULT_ADMIN_PASSWORD),
        help="Admin password",
    )
    args = parser.parse_args()

    token = login(args.api_base, args.password)
    clear_catalog(args.api_base, token)
    categories, subcategories, products = seed_catalog(args.api_base, token)
    print(
        f"[{args.api_base}] Catálogo atualizado: {categories} categorias, "
        f"{subcategories} subcategorias, {products} produtos.",
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(error, file=sys.stderr)
        sys.exit(1)
