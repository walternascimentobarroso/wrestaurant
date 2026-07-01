#!/usr/bin/env python3
"""Reset suppliers in production via the public API."""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

API_BASE = os.environ.get("API_BASE", "https://wrestaurant.onrender.com/api")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")

NEW_SUPPLIERS = [
    {
        "name": "Arcol",
        "email": "arcol@arcol.pt",
        "phone": "253 539 012",
        "notes": "Supermercado. Código: 530452",
    },
    {
        "name": "Centro de Gravacao",
        "email": "guimaraes@centrogravacao.com",
        "phone": "937 296 635",
        "notes": "Carimbo. Largo republica do brasil, 327 4810-446",
    },
    {
        "name": "Mercadona",
        "notes": "Supermercado",
    },
    {
        "name": "Karisma",
        "email": "geral@karisma.pt",
        "phone": "938 730 385",
        "notes": "Centro de Impressão. Galerias Av. D. joao IV loja n 2 4810-534",
    },
]


def request(
    method: str,
    path: str,
    token: str | None = None,
    body: dict | None = None,
) -> tuple[int, object]:
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(
        f"{API_BASE}{path}",
        data=data,
        headers=headers,
        method=method,
    )

    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            raw = response.read().decode()
            return response.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as error:
        raw = error.read().decode()
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            payload = raw
        return error.code, payload


def login() -> str:
    status, payload = request("POST", "/auth/login", body={"password": ADMIN_PASSWORD})
    if status != 200 or not isinstance(payload, dict):
        msg = f"Login falhou ({status}): {payload}"
        raise RuntimeError(msg)
    return payload["access_token"]


def unlink_payables(token: str) -> int:
    status, payables = request("GET", "/payables", token=token)
    if status != 200 or not isinstance(payables, list):
        msg = f"Listar contas falhou ({status}): {payables}"
        raise RuntimeError(msg)

    unlinked = 0
    for payable in payables:
        if not payable.get("supplierId"):
            continue
        patch_status, patch_payload = request(
            "PATCH",
            f"/payables/{payable['id']}",
            token=token,
            body={"supplierId": ""},
        )
        if patch_status != 200:
            msg = f"Desvincular {payable['id']} falhou ({patch_status}): {patch_payload}"
            raise RuntimeError(msg)
        unlinked += 1
    return unlinked


def delete_suppliers(token: str) -> int:
    status, suppliers = request("GET", "/suppliers", token=token)
    if status != 200 or not isinstance(suppliers, list):
        msg = f"Listar fornecedores falhou ({status}): {suppliers}"
        raise RuntimeError(msg)

    deleted = 0
    for supplier in suppliers:
        delete_status, delete_payload = request(
            "DELETE",
            f"/suppliers/{supplier['id']}",
            token=token,
        )
        if delete_status != 204:
            msg = f"Excluir {supplier['name']} falhou ({delete_status}): {delete_payload}"
            raise RuntimeError(msg)
        deleted += 1
    return deleted


def create_suppliers(token: str) -> int:
    created = 0
    for supplier in NEW_SUPPLIERS:
        create_status, create_payload = request("POST", "/suppliers", token=token, body=supplier)
        if create_status != 201:
            msg = f"Criar {supplier['name']} falhou ({create_status}): {create_payload}"
            raise RuntimeError(msg)
        created += 1
    return created


def main() -> None:
    token = login()
    payables_unlinked = unlink_payables(token)
    suppliers_deleted = delete_suppliers(token)
    suppliers_created = create_suppliers(token)

    status, suppliers = request("GET", "/suppliers")
    count = len(suppliers) if isinstance(suppliers, list) else 0
    print(
        f"Fornecedores: {suppliers_deleted} removidos, {suppliers_created} cadastrados "
        f"({count} na API). Contas desvinculadas: {payables_unlinked}.",
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(error, file=sys.stderr)
        sys.exit(1)
