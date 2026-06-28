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

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  subcategory: string;
  trackStock: boolean;
  stockQuantity: number;
  minStock: number;
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
