#!/usr/bin/env python3
"""Register Amora opening checklist in production via the public API."""

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request

API_BASE = "https://wrestaurant.onrender.com/api"
ADMIN_PASSWORD = "admin123"
OPENING_TEMPLATE_ID = "template-opening"
TIME_WINDOW_START = "06:30"
TIME_WINDOW_END = "07:00"
MONDAY = 1

OPENING_ITEMS: list[tuple[str, str | list[int]]] = [
    ("Colocar placa de preço externa", "all"),
    ("Desligar o alarme e ligar as luzes", "all"),
    ("Subir os stores", "all"),
    ("Receber os fornecedores de bolos e pães", "all"),
    ("Checar se os itens vem corretamente", "all"),
    ("Tirar a máquina de cartão do carregador", "all"),
    ("Ligar o open", "all"),
    ("Limpar balcão", "all"),
    ("Limpar os Vidros da frente", "all"),
    ("Limpar os vidro da montra", "all"),
    (
        "Pegar os pães com o fornecedor (ele deixa na loja no primeiro horário)",
        "all",
    ),
    ("Organizar a montra para ficar visivelmente chamativa", "all"),
    ("Assar os salgados", "all"),
    ("Colocar os sacos de lixos na lixeira", "all"),
    ("Colocar os sacos de lixos na lixeira do banheiro", "all"),
    ("Colocar os sacos de lixos na lixeira de perto da máquina de café", "all"),
    ("Colocar os sacos de lixos na lixeira da cozinha", "all"),
    ("Colocar a água com sabão na vasilha de lavar louça", "all"),
    ("Pegar panos limpos", "all"),
    ("Lavar os panos de molho", "all"),
    ("Colocar as cadeiras e mesas para fora", "all"),
    ("Colocar o óleo da fritadeira", [MONDAY]),
    ("Édellen trazer panos secos e limpos", [MONDAY]),
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
        f"/checklists/templates/{OPENING_TEMPLATE_ID}",
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
        f"/checklists/items?templateId={OPENING_TEMPLATE_ID}",
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
    for label, days_of_week in OPENING_ITEMS:
        create_status, create_payload = request(
            "POST",
            "/checklists/items",
            token=token,
            body={
                "templateId": OPENING_TEMPLATE_ID,
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

    total = daily["openingProgress"]["total"]
    print(
        f"Checklist Abertura ({TIME_WINDOW_START}–{TIME_WINDOW_END}): "
        f"{created} itens criados; {total} visíveis hoje (terça).",
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(error, file=sys.stderr)
        sys.exit(1)
