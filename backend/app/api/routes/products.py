import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_admin, get_db_session
from app.models.product import Product, RecipeLine
from app.models.supplier import Supplier
from app.models.table import TableOrderItem
from app.schemas.product import ProductCreate, ProductRead, ProductUpdate
from app.services.mappers import product_to_read

router = APIRouter(prefix="/products", tags=["products"])


def _load_products(db: Session, kind: str | None = None) -> list[Product]:
    query = db.query(Product).options(joinedload(Product.recipe_lines))
    if kind:
        query = query.filter(Product.kind == kind)
    return query.all()


def _apply_recipe(product: Product, recipe_lines: list | None) -> None:
    product.recipe_lines.clear()
    if not recipe_lines:
        return

    for line in recipe_lines:
        product.recipe_lines.append(
            RecipeLine(
                ingredient_id=line.ingredientId,
                quantity=line.quantity,
                unit=line.unit,
            ),
        )


@router.get("", response_model=list[ProductRead])
def list_products(
    kind: str | None = Query(default=None),
    category: str | None = Query(default=None),
    subcategory: str | None = Query(default=None),
    db: Session = Depends(get_db_session),
) -> list[ProductRead]:
    products = _load_products(db, kind)
    if category:
        products = [product for product in products if product.category == category]
    if subcategory:
        products = [product for product in products if product.subcategory == subcategory]
    return [product_to_read(product) for product in products]


@router.get("/{product_id}", response_model=ProductRead)
def get_product(product_id: str, db: Session = Depends(get_db_session)) -> ProductRead:
    product = db.query(Product).options(joinedload(Product.recipe_lines)).get(product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado.")
    return product_to_read(product)


@router.post("", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
def create_product(
    body: ProductCreate,
    db: Session = Depends(get_db_session),
    _admin: str = Depends(get_current_admin),
) -> ProductRead:
    product = Product(
        id=f"p-{uuid.uuid4()}",
        name=body.name.strip(),
        price=body.price,
        category=body.category,
        subcategory=body.subcategory,
        kind=body.kind,
        track_stock=body.trackStock if body.kind == "menu" else True,
        stock_quantity=body.stockQuantity,
        min_stock=body.minStock,
        stock_unit=body.stockUnit,
        package_size=body.packageSize,
        package_unit=body.packageUnit,
    )
    if body.preferredSupplierId:
        supplier = db.get(Supplier, body.preferredSupplierId)
        if not supplier:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Fornecedor preferencial não encontrado.",
            )
        product.preferred_supplier_id = body.preferredSupplierId
    _apply_recipe(product, body.recipe)
    db.add(product)
    db.commit()
    db.refresh(product)
    return product_to_read(product)


@router.patch("/{product_id}", response_model=ProductRead)
def update_product(
    product_id: str,
    body: ProductUpdate,
    db: Session = Depends(get_db_session),
    _admin: str = Depends(get_current_admin),
) -> ProductRead:
    product = db.query(Product).options(joinedload(Product.recipe_lines)).get(product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado.")

    if body.name is not None:
        product.name = body.name.strip()
    if body.price is not None:
        product.price = body.price
    if body.category is not None:
        product.category = body.category
    if body.subcategory is not None:
        product.subcategory = body.subcategory
    if body.kind is not None:
        product.kind = body.kind
    if body.trackStock is not None:
        product.track_stock = body.trackStock
    if body.stockQuantity is not None:
        product.stock_quantity = body.stockQuantity
    if body.minStock is not None:
        product.min_stock = body.minStock
    if body.stockUnit is not None:
        product.stock_unit = body.stockUnit
    if body.packageSize is not None:
        product.package_size = body.packageSize
    if body.packageUnit is not None:
        product.package_unit = body.packageUnit
    if body.preferredSupplierId is not None:
        if body.preferredSupplierId:
            supplier = db.get(Supplier, body.preferredSupplierId)
            if not supplier:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Fornecedor preferencial não encontrado.",
                )
        product.preferred_supplier_id = body.preferredSupplierId or None
    if body.recipe is not None:
        _apply_recipe(product, body.recipe)

    db.commit()
    db.refresh(product)
    return product_to_read(product)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: str,
    db: Session = Depends(get_db_session),
    _admin: str = Depends(get_current_admin),
) -> None:
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado.")

    in_orders = db.query(TableOrderItem).filter(TableOrderItem.product_id == product_id).count()
    if in_orders > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Produto em pedidos ativos.",
        )

    in_recipes = db.query(RecipeLine).filter(RecipeLine.ingredient_id == product_id).count()
    if in_recipes > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Insumo usado em receitas.",
        )

    db.delete(product)
    db.commit()
