#!/usr/bin/env python3
"""Register physical inventory counts via the public API (local or production)."""

from __future__ import annotations

import argparse
import json
import os
import sys
import unicodedata
import urllib.error
import urllib.request
from urllib.parse import quote, urljoin

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.data.inventory_count import INVENTORY_COUNT, InventoryItem

DEFAULT_API_BASE = "https://wrestaurant.onrender.com/api"
DEFAULT_ADMIN_PASSWORD = "admin123"
ADJUSTMENT_REASON = "Inventário inicial"


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


def normalize_name(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii")
    return ascii_text.casefold().strip()


def load_products(api_base: str, token: str) -> dict[str, dict]:
    status, products = request(api_base, "GET", "/products", token=token)
    if status != 200 or not isinstance(products, list):
        msg = f"Listar produtos falhou ({status}): {products}"
        raise RuntimeError(msg)

    by_name: dict[str, dict] = {}
    for product in products:
        by_name[normalize_name(product["name"])] = product
    return by_name


def resolve_product_name(item: InventoryItem) -> str:
    return item.catalog_name or item.name


def find_product(by_name: dict[str, dict], item: InventoryItem) -> dict | None:
    candidates = [item.name]
    if item.catalog_name:
        candidates.append(item.catalog_name)

    for candidate in candidates:
        product = by_name.get(normalize_name(candidate))
        if product:
            return product
    return None


def create_product(api_base: str, token: str, item: InventoryItem) -> dict:
    status, payload = request(
        api_base,
        "POST",
        "/products",
        token=token,
        body={
            "name": item.name,
            "price": item.price,
            "category": item.category,
            "subcategory": item.subcategory,
            "kind": "menu",
            "trackStock": True,
            "stockQuantity": 0,
            "minStock": 0,
            "stockUnit": "un",
        },
    )
    if status != 201 or not isinstance(payload, dict):
        msg = f"Criar produto '{item.name}' falhou ({status}): {payload}"
        raise RuntimeError(msg)
    return payload


def ensure_tracked(api_base: str, token: str, product: dict) -> dict:
    if product.get("trackStock"):
        return product

    status, payload = request(
        api_base,
        "PATCH",
        f"/products/{product['id']}",
        token=token,
        body={"trackStock": True},
    )
    if status != 200 or not isinstance(payload, dict):
        msg = f"Ativar estoque em '{product['name']}' falhou ({status}): {payload}"
        raise RuntimeError(msg)
    return payload


def set_stock(
    api_base: str,
    token: str,
    product: dict,
    target_quantity: int,
) -> float:
    current = float(product.get("stockQuantity", 0))
    delta = target_quantity - current
    if delta == 0:
        return 0

    status, payload = request(
        api_base,
        "POST",
        "/stock/adjustments",
        token=token,
        body={
            "productId": product["id"],
            "delta": delta,
            "type": "adjustment",
            "reason": ADJUSTMENT_REASON,
        },
    )
    if status != 200:
        msg = f"Ajustar estoque de '{product['name']}' falhou ({status}): {payload}"
        raise RuntimeError(msg)
    return delta


def seed_inventory(api_base: str, token: str) -> tuple[int, int, int, int]:
    by_name = load_products(api_base, token)
    created = 0
    tracked = 0
    adjusted = 0
    skipped = 0

    for item in INVENTORY_COUNT:
        product = find_product(by_name, item)
        if not product:
            product = create_product(api_base, token, item)
            by_name[normalize_name(product["name"])] = product
            created += 1

        before_track = product.get("trackStock", False)
        product = ensure_tracked(api_base, token, product)
        if not before_track:
            tracked += 1

        delta = set_stock(api_base, token, product, item.quantity)
        if delta == 0:
            skipped += 1
        else:
            adjusted += 1

    return created, tracked, adjusted, skipped


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed physical inventory via API")
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
    created, tracked, adjusted, skipped = seed_inventory(args.api_base, token)
    print(
        f"[{args.api_base}] Inventário: {len(INVENTORY_COUNT)} itens, "
        f"{created} criados, {tracked} com estoque ativado, "
        f"{adjusted} ajustados, {skipped} já corretos.",
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(error, file=sys.stderr)
        sys.exit(1)
