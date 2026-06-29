export type PaymentMethod = "cash" | "card";

export type TableCategory = "counter" | "indoor" | "outdoor";

export const TABLE_CATEGORY_LABELS: Record<TableCategory, string> = {
  counter: "Balcão",
  indoor: "Mesa",
  outdoor: "Mesa",
};

export const TABLE_SECTION_LABELS: Record<TableCategory, string> = {
  counter: "Balcão",
  indoor: "Mesas internas",
  outdoor: "Mesas externas",
};

export type ProductKind = "menu" | "ingredient";

export type StockUnit = "un" | "ml" | "cl" | "L" | "g" | "kg";

export interface RecipeLine {
  ingredientId: string;
  quantity: number;
  unit?: StockUnit;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  subcategory: string;
  kind: ProductKind;
  recipe?: RecipeLine[];
  trackStock: boolean;
  stockQuantity: number;
  minStock: number;
  stockUnit?: StockUnit;
  packageSize?: number;
  packageUnit?: StockUnit;
  lastPurchaseCost?: number | null;
  preferredSupplierId?: string | null;
}

export interface TableOrderItem {
  productId: string;
  quantity: number;
}

export interface Table {
  id: number;
  number: number;
  category: TableCategory;
  status: "free" | "occupied";
  items: TableOrderItem[];
  openedAt?: string;
}

export interface TableWithDetails extends Table {
  total: number;
  itemCount: number;
}
