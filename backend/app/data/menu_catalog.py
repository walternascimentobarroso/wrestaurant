"""Menu catalog — categories, subcategories and products."""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass


@dataclass(frozen=True)
class CatalogProduct:
    name: str
    price: float


@dataclass(frozen=True)
class CatalogSubcategory:
    name: str
    products: tuple[CatalogProduct, ...]


@dataclass(frozen=True)
class CatalogCategory:
    name: str
    subcategories: tuple[CatalogSubcategory, ...]


MENU_CATALOG: tuple[CatalogCategory, ...] = (
    CatalogCategory(
        name="Bebidas",
        subcategories=(
            CatalogSubcategory(
                name="Bebidas",
                products=(
                    CatalogProduct("Água 0.5", 1.10),
                    CatalogProduct("Água 1.5", 1.70),
                    CatalogProduct("Água com Gás", 1.20),
                    CatalogProduct("Água das Pedras", 1.20),
                    CatalogProduct("Água das Pedras Sabores", 1.50),
                    CatalogProduct("Copo Takeaway", 0.15),
                    CatalogProduct("Extra Sumo de Laranja", 1.50),
                    CatalogProduct("Fino Groselha", 1.60),
                    CatalogProduct("Fino Martini", 1.80),
                    CatalogProduct("Fino Favaios", 1.80),
                    CatalogProduct("Fino Vinho", 3.20),
                    CatalogProduct("Sagres", 1.50),
                    CatalogProduct("Sommersby", 2.00),
                    CatalogProduct("Sumo de Laranja Natural", 3.00),
                    CatalogProduct("Sumol Laranja", 1.70),
                    CatalogProduct("Ice Tea Limão", 1.70),
                    CatalogProduct("Ice Tea Manga", 1.70),
                    CatalogProduct("Seven Up", 1.70),
                    CatalogProduct("Frize", 1.70),
                    CatalogProduct("Super Bock Mini", 1.20),
                    CatalogProduct("Super Bock Sem Álcool", 1.50),
                    CatalogProduct("Super Bock Stout", 1.50),
                    CatalogProduct("Super Bock", 1.50),
                    CatalogProduct("Traçado", 1.80),
                ),
            ),
            CatalogSubcategory(
                name="Refrigerantes",
                products=(
                    CatalogProduct("Coca Cola Lata", 1.80),
                    CatalogProduct("Coca Cola Zero Lata", 1.80),
                    CatalogProduct("Fanta Lata", 1.80),
                    CatalogProduct("Guaraná do Brasil Lata", 1.80),
                ),
            ),
            CatalogSubcategory(
                name="Compal",
                products=(
                    CatalogProduct("Compal Laranja", 1.70),
                    CatalogProduct("Compal Manga", 1.70),
                    CatalogProduct("Compal Goiaba", 1.70),
                    CatalogProduct("Compal Manga Laranja", 1.70),
                    CatalogProduct("Compal Tutti Frutti", 1.70),
                    CatalogProduct("Compal Pêssego", 1.70),
                    CatalogProduct("Compal Pera", 1.70),
                    CatalogProduct("Compal Ananás", 1.70),
                    CatalogProduct("Compal Maracujá", 1.70),
                    CatalogProduct("Compal Frutos Vermelhos", 1.70),
                ),
            ),
            CatalogSubcategory(
                name="Cafeteria",
                products=(
                    CatalogProduct("Meia de Leite", 1.20),
                    CatalogProduct("Café", 0.90),
                    CatalogProduct("Abatido", 1.00),
                    CatalogProduct("Café duplo", 1.20),
                    CatalogProduct("Café duplo com leite", 2.10),
                    CatalogProduct("Carioca", 0.90),
                    CatalogProduct("Carioca Duplo", 1.25),
                    CatalogProduct("Carioca de Limão", 0.85),
                    CatalogProduct("Cevada", 0.85),
                    CatalogProduct("Cevada com leite", 1.20),
                    CatalogProduct("Cevada dupla", 1.20),
                    CatalogProduct("Cevada galão", 1.30),
                    CatalogProduct("Chá", 1.00),
                    CatalogProduct("Copo de leite", 1.00),
                    CatalogProduct("Descafeinado", 1.00),
                    CatalogProduct("Extra Descafeinado", 0.10),
                    CatalogProduct("Extra Leite de Aveia", 0.30),
                    CatalogProduct("Extra Leite sem lactose", 0.20),
                    CatalogProduct("Galão", 1.30),
                    CatalogProduct("Latte", 1.80),
                    CatalogProduct("Leite Achocolatado Agros", 1.50),
                    CatalogProduct("Leite Achocolatado UCAL", 1.60),
                    CatalogProduct("Pingo", 1.00),
                    CatalogProduct("Pingo Normal", 0.90),
                ),
            ),
            CatalogSubcategory(
                name="Digestivo",
                products=(
                    CatalogProduct("Amêndoa", 2.00),
                    CatalogProduct("CRF", 2.50),
                    CatalogProduct("Croft", 2.00),
                    CatalogProduct("Groselha", 0.20),
                    CatalogProduct("Licor Beirão", 2.50),
                    CatalogProduct("Macieira", 2.00),
                    CatalogProduct("Macieira Cream", 2.50),
                    CatalogProduct("Martini", 1.00),
                    CatalogProduct("Favaios", 1.00),
                    CatalogProduct("Ponte de Marante", 2.20),
                    CatalogProduct("Vinho do Porto", 1.50),
                    CatalogProduct("Whisky", 2.70),
                ),
            ),
            CatalogSubcategory(
                name="Gourmet",
                products=(
                    CatalogProduct("Cappuccino", 2.50),
                    CatalogProduct("Chocolate quente", 2.50),
                    CatalogProduct("Chocolate quente com chantilly", 2.50),
                    CatalogProduct("Extra Gourmet", 2.00),
                    CatalogProduct("Mocha", 2.90),
                    CatalogProduct("Iced Americano", 2.50),
                    CatalogProduct("Iced Latte", 2.90),
                    CatalogProduct("Iced Latte Caramelo", 3.70),
                    CatalogProduct("Iced Latte Baunilha", 3.70),
                    CatalogProduct("Iced Mocha", 3.90),
                ),
            ),
        ),
    ),
    CatalogCategory(
        name="Doces",
        subcategories=(
            CatalogSubcategory(
                name="Bolos e Bolachas",
                products=(
                    CatalogProduct("Banoffee", 5.00),
                    CatalogProduct("Bolacha Húngara", 0.50),
                    CatalogProduct("Bolo Gourmet", 2.50),
                    CatalogProduct("Bolos Diversos", 1.20),
                    CatalogProduct("Brigadeiro", 1.00),
                    CatalogProduct("Brownie", 2.50),
                    CatalogProduct("Caixa Coquinho", 4.00),
                    CatalogProduct("Coquinho", 0.50),
                    CatalogProduct("Croissant", 1.40),
                    CatalogProduct("Fatia de Bolo", 1.80),
                    CatalogProduct("Nata Gourmet", 1.80),
                    CatalogProduct("Paçoquinha", 0.50),
                    CatalogProduct("Pastel de Nata", 1.40),
                ),
            ),
            CatalogSubcategory(
                name="Chocolates",
                products=(
                    CatalogProduct("Chiclete", 0.10),
                    CatalogProduct("Chupa", 0.50),
                    CatalogProduct("Ferrero", 1.00),
                    CatalogProduct("Kinder Bueno", 2.00),
                    CatalogProduct("Kinder Joy", 2.50),
                    CatalogProduct("Kit Kat", 1.80),
                    CatalogProduct("Pintarolas", 2.00),
                    CatalogProduct("Raffaello", 1.00),
                    CatalogProduct("Rebuçados Dr. Bayard", 2.00),
                    CatalogProduct("Toblerone", 2.50),
                    CatalogProduct("Trident", 1.20),
                ),
            ),
        ),
    ),
    CatalogCategory(
        name="Extras",
        subcategories=(
            CatalogSubcategory(
                name="Extras",
                products=(
                    CatalogProduct("Batata Cheddar e Bacon Meia Dose", 5.00),
                    CatalogProduct("Batata Cheddar e Bacon Uma Dose", 8.00),
                    CatalogProduct("Extra Cappuccino", 1.00),
                    CatalogProduct("Ovos", 3.00),
                    CatalogProduct("Ovos e Bacon", 4.00),
                ),
            ),
            CatalogSubcategory(
                name="Gelados",
                products=(
                    CatalogProduct("Calippo Morango", 1.40),
                    CatalogProduct("Calippo Limão", 1.40),
                    CatalogProduct("Cornetto Choco Ball XL", 2.90),
                    CatalogProduct("Cornetto Clássico", 1.90),
                    CatalogProduct("Cornetto Morango", 1.90),
                    CatalogProduct("Cornetto Pistachio", 2.10),
                    CatalogProduct("Fizz", 1.00),
                    CatalogProduct("Haribo Push Up", 1.50),
                    CatalogProduct("Magnum Amêndoa", 2.50),
                    CatalogProduct("Magnum Chocolate Branco", 2.50),
                    CatalogProduct("Magnum Double Gold Billionaire", 2.50),
                    CatalogProduct("Magnum Pistachio", 2.50),
                    CatalogProduct("Magnum Sandwich", 2.20),
                    CatalogProduct("Perna de Pau", 1.50),
                    CatalogProduct("Solero", 1.70),
                    CatalogProduct("Volcanix", 2.00),
                ),
            ),
        ),
    ),
    CatalogCategory(
        name="Menu",
        subcategories=(
            CatalogSubcategory(
                name="Menu",
                products=(
                    CatalogProduct("Menu Atum", 6.80),
                    CatalogProduct("Menu Croissant", 3.80),
                    CatalogProduct("Menu Iogurt", 5.90),
                    CatalogProduct("Menu Nata", 2.00),
                    CatalogProduct("Menu Ovos e Bacon", 6.50),
                    CatalogProduct("Menu Pequeno Almoço", 1.50),
                    CatalogProduct("Menu Super Tosta", 7.50),
                    CatalogProduct("Menu Torrada", 2.50),
                    CatalogProduct("Menu Tosta", 4.50),
                    CatalogProduct("Menu Verão", 3.40),
                    CatalogProduct("Menu Misto", 3.10),
                    CatalogProduct("Menu Momento Português", 2.50),
                ),
            ),
        ),
    ),
    CatalogCategory(
        name="Pães",
        subcategories=(
            CatalogSubcategory(
                name="Pães",
                products=(
                    CatalogProduct("Croissant", 1.20),
                    CatalogProduct("Pão de Biju", 0.20),
                    CatalogProduct("Pão de Água", 0.40),
                    CatalogProduct("Pão de Semente", 0.40),
                    CatalogProduct("Croissant com manteiga", 1.60),
                    CatalogProduct("Pão de Biju com manteiga", 0.60),
                    CatalogProduct("Pão de Água com manteiga", 0.80),
                    CatalogProduct("Pão de Semente com manteiga", 0.80),
                    CatalogProduct("Croissant com Queijo", 2.40),
                    CatalogProduct("Pão de Biju com Queijo", 1.60),
                    CatalogProduct("Pão de Água com Queijo", 1.70),
                    CatalogProduct("Pão de Semente com Queijo", 1.70),
                    CatalogProduct("Croissant com Fiambre", 2.40),
                    CatalogProduct("Pão de Biju com Fiambre", 1.60),
                    CatalogProduct("Pão de Água com Fiambre", 1.70),
                    CatalogProduct("Pão de Semente com Fiambre", 1.70),
                    CatalogProduct("Croissant Misto", 2.80),
                    CatalogProduct("Pão de Biju Misto", 2.00),
                    CatalogProduct("Pão de Água Misto", 2.10),
                    CatalogProduct("Pão de Semente Misto", 2.10),
                    CatalogProduct("Manteiga", 0.10),
                ),
            ),
            CatalogSubcategory(
                name="Salgados",
                products=(
                    CatalogProduct("Batata com cheddar e bacon meia dose", 5.00),
                    CatalogProduct("Batata com cheddar e bacon uma dose", 8.00),
                    CatalogProduct("Coxinha", 1.50),
                    CatalogProduct("Folhado misto", 1.50),
                    CatalogProduct("Frigideira", 2.50),
                    CatalogProduct("Lanche Chouriço", 1.50),
                    CatalogProduct("Lanche Misto", 1.50),
                    CatalogProduct("Rissol de carne", 1.20),
                    CatalogProduct("Rissol de frango", 1.20),
                    CatalogProduct("Rissol de camarão", 1.20),
                ),
            ),
            CatalogSubcategory(
                name="Torrada",
                products=(
                    CatalogProduct("Meia Torrada", 1.50),
                    CatalogProduct("Uma Torrada", 1.80),
                    CatalogProduct("Tosta Mista", 3.20),
                ),
            ),
        ),
    ),
)


def _slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_text.lower()).strip("-")
    return slug or "item"


def create_id(prefix: str, value: str) -> str:
    return f"{prefix}-{_slugify(value)}"


def iter_catalog_products() -> list[tuple[str, str, str, str, float]]:
    """Return (product_id, name, category, subcategory, price) tuples."""
    seen_ids: set[str] = set()
    rows: list[tuple[str, str, str, float]] = []

    for category in MENU_CATALOG:
        for subcategory in category.subcategories:
            for product in subcategory.products:
                base_id = create_id(
                    "p",
                    f"{category.name}-{subcategory.name}-{product.name}",
                )
                product_id = base_id
                suffix = 2
                while product_id in seen_ids:
                    product_id = f"{base_id}-{suffix}"
                    suffix += 1
                seen_ids.add(product_id)
                rows.append(
                    (product_id, product.name, category.name, subcategory.name, product.price),
                )

    return rows


def seed_products() -> list[tuple[str, str, float, str, str]]:
    """Format used by seed_database: (id, name, price, category, subcategory)."""
    return [
        (product_id, name, price, category, subcategory)
        for product_id, name, category, subcategory, price in iter_catalog_products()
    ]
