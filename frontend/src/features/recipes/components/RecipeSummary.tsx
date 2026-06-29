import type { Product } from "@/features/tables/types";

import { getRecipeIngredientDescription } from "../utils/recipeCost";
import { hasRecipe } from "../utils/productKind";

interface RecipeSummaryProps {
  product: Product;
  products: Product[];
  className?: string;
}

export function RecipeSummary({ product, products, className }: RecipeSummaryProps) {
  if (!hasRecipe(product)) {
    return null;
  }

  const lines = getRecipeIngredientDescription(product, products);
  if (lines.length === 0) {
    return (
      <p className={className}>
        <span className="text-muted-foreground">Ficha técnica incompleta</span>
      </p>
    );
  }

  return (
    <p className={className}>
      <span className="text-muted-foreground">Consome: </span>
      <span className="font-medium text-foreground">{lines.join(", ")}</span>
    </p>
  );
}
