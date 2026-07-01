"""Reset suppliers and insert Amora Café vendor list.

Usage (from repo root):
  # Local (Docker Compose running)
  docker compose exec backend python scripts/reset_suppliers.py

  # Production (Render PostgreSQL via .env-prod)
  docker compose run --rm --no-deps \\
    -v \"$(pwd)/.env-prod:/tmp/.env-prod:ro\" \\
    backend python scripts/reset_suppliers.py /tmp/.env-prod
"""

from __future__ import annotations

import os
import sys
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.models.payable import Payable
from app.models.purchase import PurchaseRecord
from app.models.supplier import Supplier

SEED_SUPPLIERS = [
    ("supplier-arcol", "Arcol", None, "arcol@arcol.pt", "253 539 012", "Supermercado. Código: 530452"),
    (
        "supplier-centro-gravacao",
        "Centro de Gravacao",
        None,
        "guimaraes@centrogravacao.com",
        "937 296 635",
        "Carimbo. Largo republica do brasil, 327 4810-446",
    ),
    ("supplier-mercadona", "Mercadona", None, None, None, "Supermercado"),
    (
        "supplier-karisma",
        "Karisma",
        None,
        "geral@karisma.pt",
        "938 730 385",
        "Centro de Impressão. Galerias Av. D. joao IV loja n 2 4810-534",
    ),
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


def reset_suppliers(db: Session) -> None:
    payables_updated = (
        db.query(Payable)
        .filter(Payable.supplier_id.isnot(None))
        .update({Payable.supplier_id: None}, synchronize_session=False)
    )
    purchases_deleted = db.query(PurchaseRecord).delete(synchronize_session=False)
    suppliers_deleted = db.query(Supplier).delete(synchronize_session=False)

    created_at = datetime(2026, 1, 10, 9, 0, tzinfo=UTC)
    for supplier_id, name, contact, email, phone, notes in SEED_SUPPLIERS:
        db.add(
            Supplier(
                id=supplier_id,
                name=name,
                contact_name=contact,
                email=email,
                phone=phone,
                notes=notes,
                created_at=created_at,
            ),
        )

    db.commit()

    count = db.query(Supplier).count()
    print(
        f"Fornecedores: {suppliers_deleted} removidos, {count} cadastrados. "
        f"Compras removidas: {purchases_deleted}. "
        f"Contas desvinculadas: {payables_updated}.",
    )


def main() -> None:
    env_path = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    database_url = os.environ.get("DATABASE_URL")

    if database_url is None and env_path is not None:
        if not env_path.is_file():
            print(f"Arquivo não encontrado: {env_path}", file=sys.stderr)
            sys.exit(1)
        database_url = load_database_url(env_path)

    if database_url is None:
        print("DATABASE_URL não definida. Use variável de ambiente ou passe .env-prod.", file=sys.stderr)
        sys.exit(1)

    engine = create_engine(database_url)
    session_factory = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    with session_factory() as db:
        reset_suppliers(db)


if __name__ == "__main__":
    main()
