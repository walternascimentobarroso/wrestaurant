import type { Product, RecipeLine } from "@/features/tables/types";

export type ProductCreateInput = {
  name: string;
  price: number;
  category: string;
  subcategory: string;
  kind: Product["kind"];
  recipe?: Array<{
    ingredientId: string;
    quantity: number;
    unit?: RecipeLine["unit"];
  }>;
  trackStock: boolean;
  stockQuantity: number;
  minStock: number;
  stockUnit?: Product["stockUnit"];
  packageSize?: number;
  packageUnit?: Product["stockUnit"];
  preferredSupplierId?: string | null;
};

export type ProductUpdateInput = Partial<ProductCreateInput>;

function mapRecipe(
  recipe?: ProductCreateInput["recipe"],
): RecipeLine[] | undefined {
  if (!recipe || recipe.length === 0) {
    return undefined;
  }

  return recipe.map((line) => ({
    ingredientId: line.ingredientId,
    quantity: line.quantity,
    unit: line.unit,
  }));
}

function buildProductFromInput(
  id: string,
  body: ProductCreateInput,
): Product {
  return {
    id,
    name: body.name,
    price: body.price,
    category: body.category,
    subcategory: body.subcategory,
    kind: body.kind,
    recipe: mapRecipe(body.recipe),
    trackStock: body.kind === "ingredient" ? true : body.trackStock,
    stockQuantity: body.stockQuantity,
    minStock: body.minStock,
    stockUnit: body.stockUnit ?? "un",
    packageSize: body.packageSize,
    packageUnit: body.packageUnit,
    preferredSupplierId: body.preferredSupplierId,
  };
}

export function applyCreateProduct(
  products: Product[],
  body: ProductCreateInput,
  tempId: string,
): Product[] {
  return [...products, buildProductFromInput(tempId, body)];
}

export function applyUpdateProduct(
  products: Product[],
  id: string,
  body: ProductUpdateInput,
): Product[] {
  return products.map((product) => {
    if (product.id !== id) {
      return product;
    }

    const next: Product = {
      ...product,
      name: body.name ?? product.name,
      price: body.price ?? product.price,
      category: body.category ?? product.category,
      subcategory: body.subcategory ?? product.subcategory,
      kind: body.kind ?? product.kind,
      trackStock: body.trackStock ?? product.trackStock,
      stockQuantity: body.stockQuantity ?? product.stockQuantity,
      minStock: body.minStock ?? product.minStock,
      stockUnit: body.stockUnit ?? product.stockUnit,
      packageSize: body.packageSize ?? product.packageSize,
      packageUnit: body.packageUnit ?? product.packageUnit,
      preferredSupplierId: body.preferredSupplierId ?? product.preferredSupplierId,
    };

    if (body.recipe !== undefined) {
      next.recipe = mapRecipe(body.recipe);
    }

    if (next.kind === "ingredient") {
      next.trackStock = true;
      next.price = 0;
    }

    return next;
  });
}

export function applyDeleteProduct(products: Product[], id: string): Product[] {
  return products.filter((product) => product.id !== id);
}

export function replaceProductId(
  products: Product[],
  oldId: string,
  newId: string,
): Product[] {
  return products.map((product) => {
    const withId = product.id === oldId ? { ...product, id: newId } : product;

    if (!product.recipe?.length) {
      return withId;
    }

    let recipeChanged = false;
    const recipe = product.recipe.map((line) => {
      if (line.ingredientId !== oldId) {
        return line;
      }
      recipeChanged = true;
      return { ...line, ingredientId: newId };
    });

    if (!recipeChanged) {
      return withId;
    }

    return { ...withId, recipe };
  });
}
