#!/usr/bin/env python3
"""Register Amora closing checklist in production via the public API."""

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request

API_BASE = "https://wrestaurant.onrender.com/api"
ADMIN_PASSWORD = "admin123"
CLOSING_TEMPLATE_ID = "template-closing"
TIME_WINDOW_START = "19:30"
TIME_WINDOW_END = "20:00"

# 0=Dom … 5=Sex 6=Sáb
FRIDAY = 5

CLOSING_ITEMS: list[tuple[str, str | list[int]]] = [
    ("Recolher placa de preço externa", "all"),
    ("Recolher placa interna", "all"),
    ("Contar o caixa", "all"),
    ("Deixar o troco para o dia seguinte", "all"),
    ("Lavar o banheiro", "all"),
    ("Tirar o lixo do banheiro (se o lixeiro tiver sujo lavar)", "all"),
    ("Tirar o lixo de perto da máquina de café (se o lixeiro tiver sujo lavar)", "all"),
    ("Tirar o lixo da cozinha (se o lixeiro tiver sujo lavar)", "all"),
    ("Desligar o open", "all"),
    ("Deixar a máquina de cartão no carregador", "all"),
    ("Remover a água da vasilha de lavar louça", "all"),
    ("Deixar os panos de molho", "all"),
    ("Varrer o chão e passar o pano", "all"),
    ("Colocar as cadeiras e mesas para dentro", "all"),
    ("Baixar os stores", "all"),
    ("Ligar o alarme e desligar as luzes", "all"),
    ("Jogar os lixos nos lugares correspondentes", "all"),
    ("Limpar o exaustor", "all"),
    ("Limpar cozinha", "all"),
    ("Limpar as mesas e cadeiras", "all"),
    (
        "As ~6:50 vem a limpeza do condomínio para limpar na frente do prédio",
        [FRIDAY],
    ),
    ("Retirar o óleo da fritadeira", [FRIDAY]),
    ("Remover todos os sacos de lixos mesmo que não estejam completos", [FRIDAY]),
    ("Entregar os panos para Édellen lavar em casa", [FRIDAY]),
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


def main() -> None:
    token = login()

    status, payload = request(
        "PATCH",
        f"/checklists/templates/{CLOSING_TEMPLATE_ID}",
        token=token,
        body={
            "timeWindowStart": TIME_WINDOW_START,
            "timeWindowEnd": TIME_WINDOW_END,
            "active": True,
        },
    )
    if status != 200:
        msg = f"Atualizar template falhou ({status}): {payload}"
        raise RuntimeError(msg)

    status, items = request(
        "GET",
        f"/checklists/items?templateId={CLOSING_TEMPLATE_ID}",
        token=token,
    )
    if status != 200 or not isinstance(items, list):
        msg = f"Listar itens falhou ({status}): {items}"
        raise RuntimeError(msg)

    for item in items:
        item_id = item["id"]
        delete_status, delete_payload = request("DELETE", f"/checklists/items/{item_id}", token=token)
        if delete_status != 204:
            msg = f"Excluir {item_id} falhou ({delete_status}): {delete_payload}"
            raise RuntimeError(msg)

    created = 0
    for label, days_of_week in CLOSING_ITEMS:
        create_status, create_payload = request(
            "POST",
            "/checklists/items",
            token=token,
            body={
                "templateId": CLOSING_TEMPLATE_ID,
                "label": label,
                "daysOfWeek": days_of_week,
            },
        )
        if create_status != 201:
            msg = f"Criar item '{label}' falhou ({create_status}): {create_payload}"
            raise RuntimeError(msg)
        created += 1

    status, daily = request("GET", "/checklists/daily?date=2026-06-30")
    if status != 200 or not isinstance(daily, dict):
        msg = f"Validar daily falhou ({status}): {daily}"
        raise RuntimeError(msg)

    tuesday_total = daily["closingProgress"]["total"]

    status, friday_daily = request("GET", "/checklists/daily?date=2026-07-04")
    if status != 200 or not isinstance(friday_daily, dict):
        msg = f"Validar sexta falhou ({status}): {friday_daily}"
        raise RuntimeError(msg)

    friday_total = friday_daily["closingProgress"]["total"]
    friday_specific = [
        entry["item"]["label"]
        for entry in friday_daily["closing"]
        if entry["isDaySpecific"]
    ]

    print(
        f"Checklist Fecho ({TIME_WINDOW_START}–{TIME_WINDOW_END}): "
        f"{created} itens criados; {tuesday_total} visíveis hoje (terça); "
        f"{friday_total} na sexta.",
    )
    for label in friday_specific:
        print(f"  - Sexta: {label}")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(error, file=sys.stderr)
        sys.exit(1)
