"""Database seed data and bootstrap."""

from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.database import Base, engine
from app.models import (
    AppSettings,
    ChecklistCompletion,
    ChecklistItem,
    ChecklistTemplate,
    MenuCategory,
    MenuSubcategory,
    PayableCategory,
    Product,
    RestaurantTable,
    Supplier,
)
from app.models.enums import CurrencyCode, TableCategory, TableStatus
from app.services.migrations import migrate_updated_at_columns

TABLE_CATEGORY_CONFIG = [
    (TableCategory.COUNTER, 4),
    (TableCategory.INDOOR, 6),
    (TableCategory.OUTDOOR, 4),
]

FAKE_PRODUCTS = [
    ("p1", "Bruschetta", 24.9, "Entradas", "Frias"),
    ("p2", "Carpaccio", 38.5, "Entradas", "Frias"),
    ("p3", "Tábua de queijos", 42.0, "Entradas", "Frias"),
    ("p4", "Salada Caesar", 32.0, "Entradas", "Saladas"),
    ("p5", "Salada grega", 29.5, "Entradas", "Saladas"),
    ("p6", "Croquete de bacalhau", 26.0, "Entradas", "Quentes"),
    ("p7", "Bolinho de aipim", 22.0, "Entradas", "Quentes"),
    ("p8", "Picanha na brasa", 89.9, "Pratos", "Carnes"),
    ("p9", "Filé ao molho madeira", 68.5, "Pratos", "Carnes"),
    ("p10", "Costela BBQ", 74.0, "Pratos", "Carnes"),
    ("p11", "Penne ao pesto", 54.0, "Pratos", "Massas"),
    ("p12", "Risoto de camarão", 72.0, "Pratos", "Massas"),
    ("p13", "Lasanha bolonhesa", 58.0, "Pratos", "Massas"),
    ("p14", "Moqueca de peixe", 76.0, "Pratos", "Peixes"),
    ("p15", "Salmão grelhado", 82.0, "Pratos", "Peixes"),
    ("p16", "Água mineral", 6.0, "Bebidas", "Sem álcool"),
    ("p17", "Refrigerante", 8.5, "Bebidas", "Sem álcool"),
    ("p18", "Suco natural", 12.0, "Bebidas", "Sem álcool"),
    ("p19", "Cerveja artesanal", 18.0, "Bebidas", "Cervejas"),
    ("p20", "Chopp", 14.0, "Bebidas", "Cervejas"),
    ("p21", "Vinho tinto (taça)", 28.0, "Bebidas", "Vinhos"),
    ("p22", "Vinho branco (taça)", 26.0, "Bebidas", "Vinhos"),
    ("p23", "Pudim de leite", 18.9, "Sobremesas", "Clássicas"),
    ("p24", "Mousse de chocolate", 22.0, "Sobremesas", "Clássicas"),
    ("p25", "Petit gateau", 26.5, "Sobremesas", "Quentes"),
    ("p26", "Banana flambada", 24.0, "Sobremesas", "Quentes"),
]

PAYABLE_CATEGORIES = [
    ("utilities", "Utilidades"),
    ("professional-services", "Serviços profissionais"),
    ("rent", "Aluguel e condomínio"),
    ("telecom", "Telecomunicações"),
    ("taxes", "Impostos e taxas"),
    ("suppliers", "Fornecedores"),
    ("other", "Outros"),
]

SEED_SUPPLIERS = [
    ("supplier-edp", "EDP Comercial", "Linha de apoio", "clientes@edp.pt", "808 505 505", "Energia elétrica"),
    ("supplier-agua", "Águas do Litoral", "Atendimento", "faturacao@aguaslitoral.pt", "800 200 300", None),
    ("supplier-contabilista", "Silva & Associados", "Dr. Ricardo Silva", "ricardo@silvaassociados.pt", "+351 912 345 678", "Contabilidade e impostos"),
    ("supplier-imobiliaria", "Imobiliária Centro", "Ana Ferreira", "ana@imobcentro.pt", "+351 213 456 789", "Aluguel do espaço"),
    ("supplier-nos", "NOS Comunicações", None, "empresas@nos.pt", "1699", "Internet e telefone"),
    ("supplier-galp", "Galp Gás Natural", None, None, "808 280 280", None),
    ("supplier-mercado", "Mercado Local", None, None, None, "Compras de bebidas e mercearia"),
    ("supplier-socorama", "Socorama", None, None, None, "Distribuidor de bebidas"),
]

OPENING_GENERAL_ITEMS = [
    "Colocar placa de preço externa",
    "Desligar o alarme e ligar as luzes",
    "Subir os stores",
    "Ligar o open",
    "Limpar balcão",
]

CLOSING_GENERAL_ITEMS = [
    "Recolher placa de preço externa",
    "Contar o caixa",
    "Desligar o open",
    "Varrer o chão e passar o pano",
    "Ligar o alarme e desligar as luzes",
]


def _create_id(prefix: str, value: str) -> str:
    return f"{prefix}-{value.lower().replace(' ', '-')}"


def seed_database(db: Session) -> None:
    if db.query(AppSettings).first():
        return

    db.add(AppSettings(id="default", currency=CurrencyCode.EUR))

    for cat_id, cat_name in PAYABLE_CATEGORIES:
        db.add(PayableCategory(id=cat_id, name=cat_name))

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

    categories_seen: dict[str, MenuCategory] = {}
    for _pid, _name, _price, category_name, subcategory_name in FAKE_PRODUCTS:
        if category_name not in categories_seen:
            cat = MenuCategory(
                id=_create_id("cat", category_name),
                name=category_name,
            )
            categories_seen[category_name] = cat
            db.add(cat)

        cat = categories_seen[category_name]
        sub_id = _create_id("sub", f"{category_name}-{subcategory_name}")
        if not any(sub.id == sub_id for sub in cat.subcategories):
            cat.subcategories.append(MenuSubcategory(id=sub_id, name=subcategory_name))

    for product_id, name, price, category, subcategory in FAKE_PRODUCTS:
        db.add(
            Product(
                id=product_id,
                name=name,
                price=price,
                category=category,
                subcategory=subcategory,
                kind="menu",
                track_stock=False,
                stock_quantity=0,
                min_stock=0,
            ),
        )

    table_id = 1
    for category, count in TABLE_CATEGORY_CONFIG:
        for index in range(count):
            db.add(
                RestaurantTable(
                    id=table_id,
                    number=index + 1,
                    category=category,
                    status=TableStatus.FREE,
                ),
            )
            table_id += 1

    opening = ChecklistTemplate(
        id="template-opening",
        type="opening",
        title="Abertura",
        time_window_start="06:30",
        time_window_end="07:00",
        sort_order=0,
        active=True,
    )
    closing = ChecklistTemplate(
        id="template-closing",
        type="closing",
        title="Fecho",
        time_window_start="19:30",
        time_window_end="20:00",
        sort_order=1,
        active=True,
    )
    db.add(opening)
    db.add(closing)

    for index, label in enumerate(OPENING_GENERAL_ITEMS):
        db.add(
            ChecklistItem(
                id=f"opening-general-{index + 1:02d}",
                template_id=opening.id,
                label=label,
                sort_order=index,
                days_of_week="all",
                active=True,
            ),
        )

    for index, label in enumerate(CLOSING_GENERAL_ITEMS):
        db.add(
            ChecklistItem(
                id=f"closing-general-{index + 1:02d}",
                template_id=closing.id,
                label=label,
                sort_order=index,
                days_of_week="all",
                active=True,
            ),
        )

    db.commit()


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    migrate_updated_at_columns()
