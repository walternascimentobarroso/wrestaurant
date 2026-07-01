import type { StockUnit } from "@/features/tables/types";

const UNIT_PACK_TYPES = new Set(["PC", "CA", "BX", "BG", "BT", "SW"]);

export function packTypeToStockUnit(packType: string): StockUnit {
  const normalized = packType.trim().toUpperCase();

  if (normalized === "KG") {
    return "kg";
  }

  if (normalized === "LT") {
    return "L";
  }

  if (UNIT_PACK_TYPES.has(normalized)) {
    return "un";
  }

  return "un";
}
