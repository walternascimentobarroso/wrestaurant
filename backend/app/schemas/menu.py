from pydantic import BaseModel, Field


class MenuSubcategoryRead(BaseModel):
    id: str
    name: str

    model_config = {"from_attributes": True}


class MenuCategoryRead(BaseModel):
    id: str
    name: str
    subcategories: list[MenuSubcategoryRead]

    model_config = {"from_attributes": True}


class MenuCategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class MenuCategoryUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class MenuSubcategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class MenuSubcategoryUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
