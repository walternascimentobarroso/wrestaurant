from dataclasses import dataclass, field

from app.models.enums import StockUnit
from app.models.product import Product

VOLUME_UNITS = {StockUnit.ML, StockUnit.CL, StockUnit.L}
MASS_UNITS = {StockUnit.G, StockUnit.KG}

VOLUME_TO_ML = {StockUnit.ML: 1, StockUnit.CL: 10, StockUnit.L: 1000}
MASS_TO_G = {StockUnit.G: 1, StockUnit.KG: 1000}


@dataclass
class StockRequirement:
    product_id: str
    quantity: float
    sources: list[str] = field(default_factory=list)


@dataclass
class AggregatedStockRequirement:
    quantity: float
    sources: list[str] = field(default_factory=list)


def get_product_stock_unit(product: Product) -> str:
    return product.stock_unit or StockUnit.UN


def get_default_recipe_unit(ingredient: Product) -> str:
    if ingredient.package_unit:
        return ingredient.package_unit
    stock_unit = get_product_stock_unit(ingredient)
    return StockUnit.UN if stock_unit == StockUnit.UN else stock_unit


def get_recipe_line_unit(line_unit: str | None, ingredient: Product) -> str:
    return line_unit or get_default_recipe_unit(ingredient)


def convert_between_units(amount: float, from_unit: str, to_unit: str) -> float | None:
    if from_unit == to_unit:
        return amount

    if from_unit in VOLUME_UNITS and to_unit in VOLUME_UNITS:
        amount_ml = amount * VOLUME_TO_ML[from_unit]
        return amount_ml / VOLUME_TO_ML[to_unit]

    if from_unit in MASS_UNITS and to_unit in MASS_UNITS:
        amount_g = amount * MASS_TO_G[from_unit]
        return amount_g / MASS_TO_G[to_unit]

    return None


def convert_to_stock_unit(amount: float, from_unit: str, ingredient: Product) -> float:
    stock_unit = get_product_stock_unit(ingredient)
    if from_unit == stock_unit:
        return amount

    direct = convert_between_units(amount, from_unit, stock_unit)
    if direct is not None:
        return direct

    if (
        stock_unit == StockUnit.UN
        and ingredient.package_size
        and ingredient.package_size > 0
        and ingredient.package_unit
    ):
        in_package = convert_between_units(amount, from_unit, ingredient.package_unit)
        if in_package is not None:
            return in_package / ingredient.package_size

    return amount


def has_recipe(product: Product) -> bool:
    return product.kind == "menu" and bool(product.recipe_lines)


def get_product_stock_deduction(
    product: Product,
    sold_quantity: int,
    products: dict[str, Product],
) -> list[StockRequirement]:
    if product.kind == "ingredient":
        return []

    if has_recipe(product):
        requirements: list[StockRequirement] = []
        for line in product.recipe_lines:
            ingredient = products.get(line.ingredient_id)
            unit = get_recipe_line_unit(line.unit, ingredient) if ingredient else (line.unit or "un")
            quantity = (
                convert_to_stock_unit(line.quantity * sold_quantity, unit, ingredient)
                if ingredient
                else line.quantity * sold_quantity
            )
            requirements.append(
                StockRequirement(
                    product_id=line.ingredient_id,
                    quantity=quantity,
                    sources=[f"{product.name} ×{sold_quantity}"],
                ),
            )
        return requirements

    if product.track_stock:
        return [
            StockRequirement(
                product_id=product.id,
                quantity=float(sold_quantity),
                sources=[f"{product.name} ×{sold_quantity}"],
            ),
        ]

    return []


def aggregate_order_quantities(items: list[tuple[str, int]]) -> dict[str, int]:
    quantities: dict[str, int] = {}
    for product_id, quantity in items:
        quantities[product_id] = quantities.get(product_id, 0) + quantity
    return quantities


def expand_order_stock_requirements(
    items: list[tuple[str, int]],
    products: dict[str, Product],
) -> dict[str, AggregatedStockRequirement]:
    aggregated: dict[str, AggregatedStockRequirement] = {}
    order_quantities = aggregate_order_quantities(items)

    for product_id, sold_quantity in order_quantities.items():
        product = products.get(product_id)
        if not product:
            continue

        for deduction in get_product_stock_deduction(product, sold_quantity, products):
            existing = aggregated.get(deduction.product_id)
            if existing:
                existing.quantity += deduction.quantity
                existing.sources.extend(deduction.sources)
            else:
                aggregated[deduction.product_id] = AggregatedStockRequirement(
                    quantity=deduction.quantity,
                    sources=list(deduction.sources),
                )

    return aggregated


def format_recipe_sources(sources: list[str]) -> str:
    return ", ".join(dict.fromkeys(sources))


def is_low_stock(product: Product) -> bool:
    return product.track_stock and product.stock_quantity <= product.min_stock


def is_out_of_stock(product: Product) -> bool:
    return product.track_stock and product.stock_quantity <= 0
