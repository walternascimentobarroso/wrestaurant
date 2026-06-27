export interface MenuSubcategory {
  id: string;
  name: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  subcategories: MenuSubcategory[];
}

export type MenuCatalogActionResult = { ok: true } | { ok: false; error: string };
