from pydantic import BaseModel, Field

from app.models.enums import ProductKind, StockUnit


class RecipeLineRead(BaseModel):
    ingredientId: str
    quantity: float
    unit: StockUnit | None = None


class RecipeLineCreate(BaseModel):
    ingredientId: str
    quantity: float = Field(gt=0)
    unit: StockUnit | None = None


class ProductRead(BaseModel):
    id: str
    name: str
    price: float
    category: str
    subcategory: str
    kind: ProductKind
    recipe: list[RecipeLineRead] | None = None
    trackStock: bool
    stockQuantity: float
    minStock: float
    stockUnit: StockUnit | None = None
    packageSize: float | None = None
    packageUnit: StockUnit | None = None
    lastPurchaseCost: float | None = None
    preferredSupplierId: str | None = None


class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    price: float = Field(ge=0)
    category: str = Field(min_length=1)
    subcategory: str = Field(min_length=1)
    kind: ProductKind = ProductKind.MENU
    recipe: list[RecipeLineCreate] | None = None
    trackStock: bool = False
    stockQuantity: float = Field(default=0, ge=0)
    minStock: float = Field(default=0, ge=0)
    stockUnit: StockUnit = StockUnit.UN
    packageSize: float | None = Field(default=None, gt=0)
    packageUnit: StockUnit | None = None


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    price: float | None = Field(default=None, ge=0)
    category: str | None = Field(default=None, min_length=1)
    subcategory: str | None = Field(default=None, min_length=1)
    kind: ProductKind | None = None
    recipe: list[RecipeLineCreate] | None = None
    trackStock: bool | None = None
    stockQuantity: float | None = Field(default=None, ge=0)
    minStock: float | None = Field(default=None, ge=0)
    stockUnit: StockUnit | None = None
    packageSize: float | None = Field(default=None, gt=0)
    packageUnit: StockUnit | None = None
