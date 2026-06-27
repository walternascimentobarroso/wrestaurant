import { FAKE_PRODUCTS } from "@/features/tables/data/fakeProducts";

import type { MenuCategory } from "../types";

function createId(prefix: string, value: string): string {
  return `${prefix}-${value.toLowerCase().replace(/\s+/g, "-")}`;
}

export function createInitialMenuCatalog(): MenuCategory[] {
  const categories = [...new Set(FAKE_PRODUCTS.map((product) => product.category))];

  return categories.map((categoryName) => {
    const subcategoryNames = [
      ...new Set(
        FAKE_PRODUCTS.filter((product) => product.category === categoryName).map(
          (product) => product.subcategory,
        ),
      ),
    ];

    return {
      id: createId("cat", categoryName),
      name: categoryName,
      subcategories: subcategoryNames.map((name) => ({
        id: createId("sub", `${categoryName}-${name}`),
        name,
      })),
    };
  });
}
