"""Seed the Amora Café opening checklist in the target database.

Usage (from repo root):
  docker compose run --rm --no-deps \\
    -v \"$(pwd)/.env-prod:/tmp/.env-prod:ro\" \\
    backend python scripts/seed_amora_opening_checklist.py /tmp/.env-prod
"""

from __future__ import annotations

import os
import sys
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.models.checklist import ChecklistCompletion, ChecklistItem, ChecklistTemplate

OPENING_TEMPLATE_ID = "template-opening"
TIME_WINDOW_START = "06:30"
TIME_WINDOW_END = "07:00"

# Monday = 1 (0=Sunday … 6=Saturday)
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


def load_database_url(env_file: Path) -> str:
    for line in env_file.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if stripped.startswith("DATABASE_URL="):
            return stripped.removeprefix("DATABASE_URL=").strip()
    msg = f"DATABASE_URL não encontrada em {env_file}"
    raise ValueError(msg)


def seed_opening_checklist(db: Session) -> None:
    now = datetime.now(tz=UTC)
    template = db.get(ChecklistTemplate, OPENING_TEMPLATE_ID)
    if not template:
        template = ChecklistTemplate(
            id=OPENING_TEMPLATE_ID,
            type="opening",
            title="Abertura",
            time_window_start=TIME_WINDOW_START,
            time_window_end=TIME_WINDOW_END,
            sort_order=0,
            active=True,
        )
        db.add(template)
    else:
        template.title = "Abertura"
        template.time_window_start = TIME_WINDOW_START
        template.time_window_end = TIME_WINDOW_END
        template.active = True
        template.updated_at = now

    existing_items = (
        db.query(ChecklistItem)
        .filter(ChecklistItem.template_id == OPENING_TEMPLATE_ID)
        .all()
    )
    for item in existing_items:
        db.query(ChecklistCompletion).filter(ChecklistCompletion.item_id == item.id).delete()
        db.delete(item)

    for sort_order, (label, days_of_week) in enumerate(OPENING_ITEMS):
        db.add(
            ChecklistItem(
                id=f"opening-amora-{sort_order + 1:02d}",
                template_id=OPENING_TEMPLATE_ID,
                label=label,
                sort_order=sort_order,
                days_of_week=days_of_week,
                active=True,
            ),
        )

    db.commit()

    count = (
        db.query(ChecklistItem)
        .filter(ChecklistItem.template_id == OPENING_TEMPLATE_ID)
        .count()
    )
    print(f"Checklist Abertura ({TIME_WINDOW_START}–{TIME_WINDOW_END}): {count} itens.")


def main() -> None:
    env_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".env-prod")
    if not env_path.is_file():
        print(f"Arquivo não encontrado: {env_path}", file=sys.stderr)
        sys.exit(1)

    database_url = os.environ.get("DATABASE_URL") or load_database_url(env_path)
    engine = create_engine(database_url)
    session_factory = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    with session_factory() as db:
        seed_opening_checklist(db)


if __name__ == "__main__":
    main()
