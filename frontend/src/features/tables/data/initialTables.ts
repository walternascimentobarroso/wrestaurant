import type { Table, TableCategory } from "../types";

export const TABLE_CATEGORY_CONFIG: {
  category: TableCategory;
  count: number;
}[] = [
  { category: "counter", count: 4 },
  { category: "indoor", count: 6 },
  { category: "outdoor", count: 4 },
];

export function createInitialTables(): Table[] {
  let id = 1;

  return TABLE_CATEGORY_CONFIG.flatMap(({ category, count }) =>
    Array.from({ length: count }, (_, index) => ({
      id: id++,
      number: index + 1,
      category,
      status: "free" as const,
      items: [],
    })),
  );
}
