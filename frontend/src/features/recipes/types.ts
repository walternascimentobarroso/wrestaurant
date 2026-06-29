export interface StockRequirement {
  productId: string;
  quantity: number;
  sources: string[];
}

export interface AggregatedStockRequirement {
  quantity: number;
  sources: string[];
}
