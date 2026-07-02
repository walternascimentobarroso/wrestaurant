"""Physical inventory count — products and quantities."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class InventoryItem:
    """Inventory line: name in stock, quantity, optional mapping to catalog product."""

    name: str
    quantity: int
    catalog_name: str | None = None
    category: str = "Bebidas"
    subcategory: str = "Bebidas"
    price: float = 1.70


INVENTORY_COUNT: tuple[InventoryItem, ...] = (
    InventoryItem("Compal Ananás", 14, catalog_name="Compal Ananás", subcategory="Compal"),
    InventoryItem(
        "Compal Ananás Coco",
        10,
        category="Bebidas",
        subcategory="Compal",
    ),
    InventoryItem(
        "Compal Frutos Vermelhos",
        13,
        catalog_name="Compal Frutos Vermelhos",
        subcategory="Compal",
    ),
    InventoryItem("Compal Goiaba", 8, catalog_name="Compal Goiaba", subcategory="Compal"),
    InventoryItem("Compal Pêra", 12, catalog_name="Compal Pera", subcategory="Compal"),
    InventoryItem(
        "Compal Manga/Laranja/Cenoura",
        8,
        category="Bebidas",
        subcategory="Compal",
    ),
    InventoryItem(
        "Compal Manga/Laranja",
        4,
        catalog_name="Compal Manga Laranja",
        subcategory="Compal",
    ),
    InventoryItem("Compal Maracujá", 13, catalog_name="Compal Maracujá", subcategory="Compal"),
    InventoryItem(
        "Compal Laranja do Algarve",
        10,
        category="Bebidas",
        subcategory="Compal",
    ),
    InventoryItem("Compal Pêssego", 8, catalog_name="Compal Pêssego", subcategory="Compal"),
    InventoryItem(
        "Compal Tutti Frutti",
        13,
        catalog_name="Compal Tutti Frutti",
        subcategory="Compal",
    ),
    InventoryItem("Coca-Cola", 8, catalog_name="Coca Cola Lata", subcategory="Refrigerantes"),
    InventoryItem(
        "Coca-Cola Zero",
        13,
        catalog_name="Coca Cola Zero Lata",
        subcategory="Refrigerantes",
    ),
    InventoryItem("Seven Up", 9, catalog_name="Seven Up"),
    InventoryItem("Seven Up Grande", 1, price=2.00),
    InventoryItem("Sumol Laranja", 5, catalog_name="Sumol Laranja"),
    InventoryItem("Sumol Ananás", 1),
    InventoryItem("Sumol Eclipse", 4),
    InventoryItem("Fanta", 1, catalog_name="Fanta Lata", subcategory="Refrigerantes"),
    InventoryItem(
        "Guaraná Brasil",
        1,
        catalog_name="Guaraná do Brasil Lata",
        subcategory="Refrigerantes",
    ),
    InventoryItem("Ice Tea Manga", 1, catalog_name="Ice Tea Manga"),
    InventoryItem("Ice Tea Limão", 1, catalog_name="Ice Tea Limão"),
    InventoryItem("Ice Tea Pêssego", 1),
    InventoryItem("Água 0,5L", 20, catalog_name="Água 0.5", price=1.10),
    InventoryItem("Água Grande", 5, catalog_name="Água 1.5", price=1.70),
    InventoryItem("Água Monchique", 6, price=1.10),
    InventoryItem("Água das Pedras", 8, catalog_name="Água das Pedras", price=1.20),
    InventoryItem("Água das Pedras Limão", 10, price=1.50),
    InventoryItem("Frize", 2, catalog_name="Frize"),
    InventoryItem(
        "Ucal",
        5,
        catalog_name="Leite Achocolatado UCAL",
        subcategory="Cafeteria",
        price=1.60,
    ),
    InventoryItem(
        "Agros",
        4,
        catalog_name="Leite Achocolatado Agros",
        subcategory="Cafeteria",
        price=1.50,
    ),
    InventoryItem("Red Bull", 6, price=2.50),
    InventoryItem("Summersby", 4, catalog_name="Sommersby", price=2.00),
    InventoryItem("Super Bock Mini", 28, catalog_name="Super Bock Mini", price=1.20),
    InventoryItem("Super Bock Grande", 20, catalog_name="Super Bock", price=1.50),
    InventoryItem("Super Bock Stout", 3, catalog_name="Super Bock Stout", price=1.50),
    InventoryItem(
        "Super Bock Zero",
        5,
        catalog_name="Super Bock Sem Álcool",
        price=1.50,
    ),
    InventoryItem("Sagres", 5, catalog_name="Sagres", price=1.50),
    InventoryItem("Croft", 1, catalog_name="Croft", subcategory="Digestivo", price=2.00),
    InventoryItem("Favaios", 1, catalog_name="Favaios", subcategory="Digestivo", price=1.00),
    InventoryItem("Martini", 1, catalog_name="Martini", subcategory="Digestivo", price=1.00),
    InventoryItem(
        "Porto Tawny",
        1,
        catalog_name="Vinho do Porto",
        subcategory="Digestivo",
        price=1.50,
    ),
    InventoryItem("Licor 35", 1, subcategory="Digestivo", price=2.50),
    InventoryItem("Groselha", 1, catalog_name="Groselha", subcategory="Digestivo", price=0.20),
    InventoryItem("Amarguinha", 3, subcategory="Digestivo", price=2.00),
    InventoryItem("KitKat", 24, catalog_name="Kit Kat", category="Doces", subcategory="Chocolates", price=1.80),
    InventoryItem(
        "Kinder Joy",
        4,
        catalog_name="Kinder Joy",
        category="Doces",
        subcategory="Chocolates",
        price=2.50,
    ),
    InventoryItem(
        "Raffaello",
        10,
        catalog_name="Raffaello",
        category="Doces",
        subcategory="Chocolates",
        price=1.00,
    ),
    InventoryItem(
        "Paçoquinha",
        10,
        catalog_name="Paçoquinha",
        category="Doces",
        subcategory="Bolos e Bolachas",
        price=0.50,
    ),
    InventoryItem("Barra Milka", 3, category="Doces", subcategory="Chocolates", price=1.50),
    InventoryItem(
        "Pintarolas (caixa)",
        1,
        catalog_name="Pintarolas",
        category="Doces",
        subcategory="Chocolates",
        price=2.00,
    ),
    InventoryItem(
        "Trident White (caixa)",
        1,
        category="Doces",
        subcategory="Chocolates",
        price=1.20,
    ),
    InventoryItem(
        "Trident Watermelon (caixa)",
        1,
        category="Doces",
        subcategory="Chocolates",
        price=1.20,
    ),
    InventoryItem(
        "Chicles",
        30,
        catalog_name="Chiclete",
        category="Doces",
        subcategory="Chocolates",
        price=0.10,
    ),
    InventoryItem(
        "Rebuçados Dr. Bayard",
        3,
        catalog_name="Rebuçados Dr. Bayard",
        category="Doces",
        subcategory="Chocolates",
        price=2.00,
    ),
    InventoryItem("Cavalheiros", 8, subcategory="Digestivo", price=2.00),
)
