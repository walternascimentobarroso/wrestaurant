import { normalizeProducts } from "@/features/stock/utils/productStock";

import type { Product } from "../types";

type ProductSeed = Omit<
  Product,
  "trackStock" | "stockQuantity" | "minStock" | "kind" | "recipe" | "stockUnit" | "packageSize" | "packageUnit"
>;

const BASE_FAKE_PRODUCTS: ProductSeed[] = [
  { id: "p1", name: "Bruschetta", price: 24.9, category: "Entradas", subcategory: "Frias" },
  { id: "p2", name: "Carpaccio", price: 38.5, category: "Entradas", subcategory: "Frias" },
  { id: "p3", name: "Tábua de queijos", price: 42.0, category: "Entradas", subcategory: "Frias" },
  { id: "p4", name: "Salada Caesar", price: 32.0, category: "Entradas", subcategory: "Saladas" },
  { id: "p5", name: "Salada grega", price: 29.5, category: "Entradas", subcategory: "Saladas" },
  { id: "p6", name: "Croquete de bacalhau", price: 26.0, category: "Entradas", subcategory: "Quentes" },
  { id: "p7", name: "Bolinho de aipim", price: 22.0, category: "Entradas", subcategory: "Quentes" },

  { id: "p8", name: "Picanha na brasa", price: 89.9, category: "Pratos", subcategory: "Carnes" },
  { id: "p9", name: "Filé ao molho madeira", price: 68.5, category: "Pratos", subcategory: "Carnes" },
  { id: "p10", name: "Costela BBQ", price: 74.0, category: "Pratos", subcategory: "Carnes" },
  { id: "p11", name: "Penne ao pesto", price: 54.0, category: "Pratos", subcategory: "Massas" },
  { id: "p12", name: "Risoto de camarão", price: 72.0, category: "Pratos", subcategory: "Massas" },
  { id: "p13", name: "Lasanha bolonhesa", price: 58.0, category: "Pratos", subcategory: "Massas" },
  { id: "p14", name: "Moqueca de peixe", price: 76.0, category: "Pratos", subcategory: "Peixes" },
  { id: "p15", name: "Salmão grelhado", price: 82.0, category: "Pratos", subcategory: "Peixes" },

  { id: "p16", name: "Água mineral", price: 6.0, category: "Bebidas", subcategory: "Sem álcool" },
  { id: "p17", name: "Refrigerante", price: 8.5, category: "Bebidas", subcategory: "Sem álcool" },
  { id: "p18", name: "Suco natural", price: 12.0, category: "Bebidas", subcategory: "Sem álcool" },
  { id: "p19", name: "Cerveja artesanal", price: 18.0, category: "Bebidas", subcategory: "Cervejas" },
  { id: "p20", name: "Chopp", price: 14.0, category: "Bebidas", subcategory: "Cervejas" },
  { id: "p21", name: "Vinho tinto (taça)", price: 28.0, category: "Bebidas", subcategory: "Vinhos" },
  { id: "p22", name: "Vinho branco (taça)", price: 26.0, category: "Bebidas", subcategory: "Vinhos" },

  { id: "p23", name: "Pudim de leite", price: 18.9, category: "Sobremesas", subcategory: "Clássicas" },
  { id: "p24", name: "Mousse de chocolate", price: 22.0, category: "Sobremesas", subcategory: "Clássicas" },
  { id: "p25", name: "Petit gateau", price: 26.5, category: "Sobremesas", subcategory: "Quentes" },
  { id: "p26", name: "Banana flambada", price: 24.0, category: "Sobremesas", subcategory: "Quentes" },
];

export const FAKE_PRODUCTS: Product[] = normalizeProducts(
  BASE_FAKE_PRODUCTS as Product[],
);

export function getCategories(): string[] {
  return [...new Set(FAKE_PRODUCTS.map((product) => product.category))];
}

export function getSubcategories(category: string): string[] {
  return [
    ...new Set(
      FAKE_PRODUCTS.filter((product) => product.category === category).map(
        (product) => product.subcategory,
      ),
    ),
  ];
}

export function getProductsByCategoryAndSubcategory(
  category: string,
  subcategory: string,
): Product[] {
  return FAKE_PRODUCTS.filter(
    (product) =>
      product.category === category && product.subcategory === subcategory,
  );
}
