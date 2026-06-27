import type { Table } from "../types";

export const TABLE_COUNT = 12;

export function createInitialTables(): Table[] {
  return Array.from({ length: TABLE_COUNT }, (_, index) => ({
    id: index + 1,
    number: index + 1,
    status: "free" as const,
    items: [],
  }));
}
