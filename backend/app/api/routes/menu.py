import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_admin, get_db_session
from app.models.menu import MenuCategory, MenuSubcategory
from app.models.product import Product
from app.schemas.menu import (
    MenuCategoryCreate,
    MenuCategoryRead,
    MenuCategoryUpdate,
    MenuSubcategoryCreate,
    MenuSubcategoryUpdate,
)
from app.services.mappers import category_to_read

router = APIRouter(prefix="/menu", tags=["menu"])


@router.get("/categories", response_model=list[MenuCategoryRead])
def list_categories(db: Session = Depends(get_db_session)) -> list[MenuCategoryRead]:
    categories = db.query(MenuCategory).options(joinedload(MenuCategory.subcategories)).all()
    return [category_to_read(category) for category in categories]


@router.post("/categories", response_model=MenuCategoryRead, status_code=status.HTTP_201_CREATED)
def create_category(
    body: MenuCategoryCreate,
    db: Session = Depends(get_db_session),
    _admin: str = Depends(get_current_admin),
) -> MenuCategoryRead:
    name = body.name.strip()
    existing = db.query(MenuCategory).filter(MenuCategory.name.ilike(name)).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Já existe uma categoria com este nome.")

    category = MenuCategory(id=f"cat-{uuid.uuid4()}", name=name)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category_to_read(category)


@router.patch("/categories/{category_id}", response_model=MenuCategoryRead)
def update_category(
    category_id: str,
    body: MenuCategoryUpdate,
    db: Session = Depends(get_db_session),
    _admin: str = Depends(get_current_admin),
) -> MenuCategoryRead:
    category = db.get(MenuCategory, category_id)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoria não encontrada.")

    name = body.name.strip()
    conflict = (
        db.query(MenuCategory)
        .filter(MenuCategory.id != category_id, MenuCategory.name.ilike(name))
        .first()
    )
    if conflict:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Já existe uma categoria com este nome.")

    old_name = category.name
    category.name = name
    if old_name != name:
        db.query(Product).filter(Product.category == old_name).update({"category": name})
    db.commit()
    db.refresh(category)
    return category_to_read(category)


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: str,
    db: Session = Depends(get_db_session),
    _admin: str = Depends(get_current_admin),
) -> None:
    category = db.get(MenuCategory, category_id)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoria não encontrada.")

    product_count = db.query(Product).filter(Product.category == category.name).count()
    if product_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Não é possível excluir: {product_count} produto(s) vinculado(s).",
        )

    db.delete(category)
    db.commit()


@router.post(
    "/categories/{category_id}/subcategories",
    response_model=MenuCategoryRead,
    status_code=status.HTTP_201_CREATED,
)
def create_subcategory(
    category_id: str,
    body: MenuSubcategoryCreate,
    db: Session = Depends(get_db_session),
    _admin: str = Depends(get_current_admin),
) -> MenuCategoryRead:
    category = db.query(MenuCategory).options(joinedload(MenuCategory.subcategories)).get(category_id)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoria não encontrada.")

    name = body.name.strip()
    if any(sub.name.lower() == name.lower() for sub in category.subcategories):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Subcategoria já existe.")

    category.subcategories.append(MenuSubcategory(id=f"sub-{uuid.uuid4()}", name=name))
    db.commit()
    db.refresh(category)
    return category_to_read(category)


@router.patch("/subcategories/{subcategory_id}", response_model=MenuCategoryRead)
def update_subcategory(
    subcategory_id: str,
    body: MenuSubcategoryUpdate,
    db: Session = Depends(get_db_session),
    _admin: str = Depends(get_current_admin),
) -> MenuCategoryRead:
    subcategory = db.get(MenuSubcategory, subcategory_id)
    if not subcategory:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subcategoria não encontrada.")

    name = body.name.strip()
    category = db.query(MenuCategory).options(joinedload(MenuCategory.subcategories)).get(subcategory.category_id)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoria não encontrada.")

    if any(sub.id != subcategory_id and sub.name.lower() == name.lower() for sub in category.subcategories):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Subcategoria já existe.")

    old_name = subcategory.name
    subcategory.name = name
    if old_name != name:
        db.query(Product).filter(
            Product.category == category.name,
            Product.subcategory == old_name,
        ).update({"subcategory": name})
    db.commit()
    db.refresh(category)
    return category_to_read(category)


@router.delete("/subcategories/{subcategory_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subcategory(
    subcategory_id: str,
    db: Session = Depends(get_db_session),
    _admin: str = Depends(get_current_admin),
) -> None:
    subcategory = db.get(MenuSubcategory, subcategory_id)
    if not subcategory:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subcategoria não encontrada.")

    category = db.get(MenuCategory, subcategory.category_id)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoria não encontrada.")

    product_count = (
        db.query(Product)
        .filter(Product.category == category.name, Product.subcategory == subcategory.name)
        .count()
    )
    if product_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Não é possível excluir: {product_count} produto(s) vinculado(s).",
        )

    db.delete(subcategory)
    db.commit()
