export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  subcategory: string;
}

export interface TableOrderItem {
  productId: string;
  quantity: number;
}

export interface Table {
  id: number;
  number: number;
  status: "free" | "occupied";
  items: TableOrderItem[];
  openedAt?: string;
}

export interface TableWithDetails extends Table {
  total: number;
  itemCount: number;
}
