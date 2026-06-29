import type { Product, RecipeLine, StockUnit } from "@/features/tables/types";

export const STOCK_UNIT_LABELS: Record<StockUnit, string> = {
  un: "Unidade",
  ml: "Mililitro (ml)",
  cl: "Centilitro (cl)",
  L: "Litro (L)",
  g: "Grama (g)",
  kg: "Quilograma (kg)",
};

export const STOCK_UNIT_SHORT: Record<StockUnit, string> = {
  un: "un",
  ml: "ml",
  cl: "cl",
  L: "L",
  g: "g",
  kg: "kg",
};

export const VOLUME_UNITS: StockUnit[] = ["ml", "cl", "L"];
export const MASS_UNITS: StockUnit[] = ["g", "kg"];
export const RECIPE_UNITS: StockUnit[] = ["un", "ml", "cl", "L", "g", "kg"];

const VOLUME_TO_ML: Record<"ml" | "cl" | "L", number> = {
  ml: 1,
  cl: 10,
  L: 1000,
};

const MASS_TO_G: Record<"g" | "kg", number> = {
  g: 1,
  kg: 1000,
};

export function isVolumeUnit(unit: StockUnit): boolean {
  return VOLUME_UNITS.includes(unit);
}

export function isMassUnit(unit: StockUnit): boolean {
  return MASS_UNITS.includes(unit);
}

export function getProductStockUnit(product: Product): StockUnit {
  return product.stockUnit ?? "un";
}

export function getRecipeLineUnit(line: RecipeLine, ingredient: Product): StockUnit {
  return line.unit ?? getDefaultRecipeUnit(ingredient);
}

export function getDefaultRecipeUnit(ingredient: Product): StockUnit {
  if (ingredient.packageUnit) {
    return ingredient.packageUnit;
  }

  const stockUnit = getProductStockUnit(ingredient);
  return stockUnit === "un" ? "un" : stockUnit;
}

export function convertBetweenUnits(
  amount: number,
  fromUnit: StockUnit,
  toUnit: StockUnit,
): number | null {
  if (fromUnit === toUnit) {
    return amount;
  }

  if (isVolumeUnit(fromUnit) && isVolumeUnit(toUnit)) {
    const amountMl = amount * VOLUME_TO_ML[fromUnit as keyof typeof VOLUME_TO_ML];
    return amountMl / VOLUME_TO_ML[toUnit as keyof typeof VOLUME_TO_ML];
  }

  if (isMassUnit(fromUnit) && isMassUnit(toUnit)) {
    const amountG = amount * MASS_TO_G[fromUnit as keyof typeof MASS_TO_G];
    return amountG / MASS_TO_G[toUnit as keyof typeof MASS_TO_G];
  }

  return null;
}

export function convertToStockUnit(
  amount: number,
  fromUnit: StockUnit,
  ingredient: Product,
): number {
  const stockUnit = getProductStockUnit(ingredient);

  if (fromUnit === stockUnit) {
    return amount;
  }

  const direct = convertBetweenUnits(amount, fromUnit, stockUnit);
  if (direct !== null) {
    return direct;
  }

  if (
    stockUnit === "un" &&
    ingredient.packageSize &&
    ingredient.packageSize > 0 &&
    ingredient.packageUnit
  ) {
    const inPackageUnit = convertBetweenUnits(amount, fromUnit, ingredient.packageUnit);
    if (inPackageUnit !== null) {
      return inPackageUnit / ingredient.packageSize;
    }
  }

  return amount;
}

export function convertRecipeToStockUnit(
  quantity: number,
  unit: StockUnit,
  ingredient: Product,
): number {
  return convertToStockUnit(quantity, unit, ingredient);
}

export function getStockUnitLabelForValues(
  stockUnit: StockUnit,
  packageSize?: number,
  packageUnit?: StockUnit,
): string {
  if (stockUnit === "un" && packageSize && packageUnit) {
    return "garrafa";
  }

  return STOCK_UNIT_SHORT[stockUnit];
}

export function getStockUnitLabel(product: Product): string {
  return getStockUnitLabelForValues(
    getProductStockUnit(product),
    product.packageSize,
    product.packageUnit,
  );
}

export function formatStockAmount(product: Product, quantity = product.stockQuantity): string {
  const label = getStockUnitLabel(product);
  const formatted = formatQuantity(quantity);

  if (
    getProductStockUnit(product) === "un" &&
    product.packageSize &&
    product.packageUnit &&
    quantity > 0
  ) {
    const totalInPackageUnit = quantity * product.packageSize;
    return `${formatted} ${label} (${formatQuantity(totalInPackageUnit)} ${STOCK_UNIT_SHORT[product.packageUnit]} total)`;
  }

  return `${formatted} ${label}`;
}

export function formatRecipeAmount(quantity: number, unit: StockUnit): string {
  return `${formatQuantity(quantity)} ${STOCK_UNIT_SHORT[unit]}`;
}

export function formatQuantity(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }

  const rounded = Math.round(value * 1000) / 1000;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, "");
}

export function getPurchaseUnitLabel(product: Product): string {
  const stockUnit = getProductStockUnit(product);

  if (stockUnit === "un" && product.packageSize && product.packageUnit) {
    return `garrafa (${formatQuantity(product.packageSize)} ${STOCK_UNIT_SHORT[product.packageUnit]})`;
  }

  return STOCK_UNIT_LABELS[stockUnit];
}

export function areUnitsCompatible(
  recipeUnit: StockUnit,
  ingredient: Product,
): boolean {
  const stockUnit = getProductStockUnit(ingredient);

  if (recipeUnit === stockUnit) {
    return true;
  }

  if (convertBetweenUnits(1, recipeUnit, stockUnit) !== null) {
    return true;
  }

  if (stockUnit === "un" && ingredient.packageSize && ingredient.packageUnit) {
    return convertBetweenUnits(1, recipeUnit, ingredient.packageUnit) !== null;
  }

  return recipeUnit === "un" && stockUnit === "un";
}
