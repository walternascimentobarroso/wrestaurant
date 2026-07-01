"use client";

import { useMemo, useState } from "react";
import { History, Package, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useMenuCatalog } from "@/features/menu/hooks/useMenuCatalog";
import { useIngredients } from "@/features/menu/hooks/useProducts";
import { useProductAdmin } from "@/features/menu/hooks/useProductAdmin";
import {
  getSubcategories,
  getSubcategoryNames,
} from "@/features/menu/services/menuCatalogStorage";
import { PurchaseHistoryDialog } from "@/features/purchases/components/PurchaseHistoryDialog";
import { usePurchases } from "@/features/purchases/hooks/usePurchases";
import {
  calculateMargin,
  calculateProductMargin,
  getMarginColorClass,
} from "@/features/purchases/utils/margin";
import { RecipeEditor } from "@/features/recipes/components/RecipeEditor";
import { RecipeSummary } from "@/features/recipes/components/RecipeSummary";
import { calculateRecipeCost } from "@/features/recipes/utils/recipeCost";
import { hasRecipe, isIngredient } from "@/features/recipes/utils/productKind";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { isLowStock, isOutOfStock } from "@/features/stock/utils/productStock";
import {
  formatStockAmount,
  getStockUnitLabelForValues,
  STOCK_UNIT_LABELS,
} from "@/features/stock/utils/stockUnits";
import { useSuppliers } from "@/features/suppliers/hooks/useSuppliers";
import { getSupplierName } from "@/features/suppliers/services/supplierService";
import { cn } from "@/lib/utils";
import type { Product, ProductKind, RecipeLine, StockUnit } from "@/features/tables/types";

type KindFilter = "all" | ProductKind;

interface ProductFormState {
  kind: ProductKind;
  name: string;
  price: string;
  category: string;
  subcategory: string;
  usesRecipe: boolean;
  recipe: RecipeLine[];
  trackStock: boolean;
  stockQuantity: string;
  minStock: string;
  stockUnit: StockUnit;
  usesPackage: boolean;
  packageSize: string;
  packageUnit: StockUnit;
}

const EMPTY_FORM: ProductFormState = {
  kind: "menu",
  name: "",
  price: "",
  category: "",
  subcategory: "",
  usesRecipe: false,
  recipe: [],
  trackStock: true,
  stockQuantity: "50",
  minStock: "5",
  stockUnit: "un",
  usesPackage: false,
  packageSize: "",
  packageUnit: "cl",
};

const PAGE_SIZE = 10;

export function AdminProductsPage() {
  const { formatCurrency } = useSettings();
  const { categories } = useMenuCatalog();
  const { suppliers } = useSuppliers();
  const { getHistoryForProduct, getInsightsForProduct } = usePurchases();
  const { products, createProduct, updateProduct, deleteProduct } = useProductAdmin();
  const ingredients = useIngredients();

  const categoryNames = categories.map((category) => category.name);
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const subcategoryOptions = getSubcategories(categories, form.category);

  const ingredientStockLabel = getStockUnitLabelForValues(
    form.stockUnit,
    form.usesPackage ? Number.parseFloat(form.packageSize.replace(",", ".")) : undefined,
    form.packageUnit,
  );

  const filteredProducts = useMemo(() => {
    const sorted = [...products].sort((a, b) => a.name.localeCompare(b.name, "pt-PT"));

    const byKind =
      kindFilter === "all"
        ? sorted
        : sorted.filter((product) => product.kind === kindFilter);

    if (filterCategory === "all") {
      return byKind;
    }

    return byKind.filter((product) => product.category === filterCategory);
  }, [products, kindFilter, filterCategory]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const effectivePage = Math.min(currentPage, totalPages);

  const paginatedProducts = useMemo(() => {
    const start = (effectivePage - 1) * PAGE_SIZE;
    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [filteredProducts, effectivePage]);

  const rangeStart =
    filteredProducts.length === 0 ? 0 : (effectivePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(effectivePage * PAGE_SIZE, filteredProducts.length);

  const previewSalePrice = Number.parseFloat(form.price.replace(",", "."));
  const productForPreview = editingProduct
    ? (products.find((product) => product.id === editingProduct.id) ?? editingProduct)
    : null;
  const previewCost = useMemo(() => {
    if (form.kind === "menu" && form.usesRecipe && form.recipe.length > 0) {
      return calculateRecipeCost(
        {
          id: editingProduct?.id ?? "preview",
          name: form.name,
          price: previewSalePrice,
          category: form.category,
          subcategory: form.subcategory,
          kind: "menu",
          recipe: form.recipe,
          trackStock: false,
          stockQuantity: 0,
          minStock: 0,
        },
        products,
      );
    }

    return productForPreview?.lastPurchaseCost ?? null;
  }, [
    form.kind,
    form.usesRecipe,
    form.recipe,
    form.name,
    form.category,
    form.subcategory,
    editingProduct?.id,
    previewSalePrice,
    products,
    productForPreview?.lastPurchaseCost,
  ]);

  const previewMargin = useMemo(() => {
    if (!Number.isFinite(previewSalePrice) || previewSalePrice <= 0) {
      return { amount: null, percent: null };
    }

    return calculateMargin(previewSalePrice, previewCost);
  }, [previewSalePrice, previewCost]);

  function handleKindFilterChange(kind: KindFilter) {
    setKindFilter(kind);
    setCurrentPage(1);
  }

  function handleFilterChange(category: string) {
    setFilterCategory(category);
    setCurrentPage(1);
  }

  function openPurchaseHistory(product: Product) {
    setHistoryProduct(product);
    window.setTimeout(() => setHistoryOpen(true), 0);
  }

  function closePurchaseHistory() {
    setHistoryOpen(false);
    setHistoryProduct(null);
  }

  function getDefaultCategory(): string {
    return categoryNames[0] ?? "";
  }

  function getDefaultSubcategory(category: string): string {
    return getSubcategoryNames(categories, category)[0] ?? "";
  }

  function openCreateForm(kind: ProductKind = kindFilter === "ingredient" ? "ingredient" : "menu") {
    const category = getDefaultCategory();
    setEditingProduct(null);
    setForm({
      kind,
      name: "",
      price: "",
      category,
      subcategory: getDefaultSubcategory(category),
      usesRecipe: false,
      recipe: [],
      trackStock: kind === "ingredient",
      stockQuantity: "50",
      minStock: "5",
      stockUnit: kind === "ingredient" ? "un" : "un",
      usesPackage: false,
      packageSize: "",
      packageUnit: "cl",
    });
    setFormError("");
    setFormOpen(true);
  }

  function openEditForm(product: Product) {
    setEditingProduct(product);
    setForm({
      kind: product.kind,
      name: product.name,
      price: isIngredient(product) ? "" : String(product.price),
      category: product.category,
      subcategory: product.subcategory,
      usesRecipe: hasRecipe(product),
      recipe: product.recipe ? [...product.recipe] : [],
      trackStock: product.trackStock,
      stockQuantity: String(product.stockQuantity),
      minStock: String(product.minStock),
      stockUnit: product.stockUnit ?? "un",
      usesPackage: Boolean(product.packageSize && product.packageUnit),
      packageSize: product.packageSize ? String(product.packageSize) : "",
      packageUnit: product.packageUnit ?? "cl",
    });
    setFormError("");
    setFormOpen(true);
  }

  function handleCategoryChange(category: string) {
    setForm((current) => ({
      ...current,
      category,
      subcategory: getSubcategoryNames(categories, category)[0] ?? "",
    }));
  }

  async function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const price =
      form.kind === "ingredient"
        ? 0
        : Number.parseFloat(form.price.replace(",", "."));
    const stockQuantity =
      form.kind === "ingredient"
        ? Number.parseFloat(form.stockQuantity.replace(",", "."))
        : Number.parseInt(form.stockQuantity, 10);
    const minStock =
      form.kind === "ingredient"
        ? Number.parseFloat(form.minStock.replace(",", "."))
        : Number.parseInt(form.minStock, 10);

    if (form.kind === "menu" && form.usesRecipe) {
      const hasValidLine = form.recipe.some(
        (line) => line.ingredientId && Number.isFinite(line.quantity) && line.quantity > 0,
      );
      if (!hasValidLine) {
        setFormError("Adicione pelo menos um insumo à ficha técnica.");
        return;
      }
    }

    const input = {
      name: form.name,
      price,
      category: form.category,
      subcategory: form.subcategory,
      kind: form.kind,
      recipe: form.usesRecipe ? form.recipe : undefined,
      trackStock: form.trackStock,
      stockQuantity,
      minStock,
      stockUnit: form.stockUnit,
      usesPackage: form.stockUnit === "un" && form.usesPackage,
      packageSize:
        form.stockUnit === "un" && form.usesPackage
          ? Number.parseFloat(form.packageSize.replace(",", "."))
          : undefined,
      packageUnit:
        form.stockUnit === "un" && form.usesPackage ? form.packageUnit : undefined,
    };

    const result = await (editingProduct
      ? updateProduct(editingProduct.id, input)
      : createProduct(input));

    if (!result.ok) {
      setFormError(result.error ?? "Não foi possível salvar o produto.");
      return;
    }

    setFormOpen(false);
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setFormError("");
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) {
      return;
    }

    const result = await deleteProduct(deleteTarget.id);
    if (!result.ok) {
      setDeleteError(result.error ?? "Não foi possível excluir o produto.");
      return;
    }

    setDeleteTarget(null);
    setDeleteError("");
  }

  if (categoryNames.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <header className="shrink-0 border-b border-border bg-card px-6 py-4">
          <h2 className="font-heading text-xl font-bold text-foreground">Produtos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastre os itens do cardápio vinculados às categorias.
          </p>
        </header>
        <div className="flex flex-1 items-center justify-center px-6">
          <p className="text-center text-muted-foreground">
            Cadastre categorias e subcategorias antes de adicionar produtos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b border-border bg-card px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-heading text-xl font-bold text-foreground">Produtos</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {products.length} {products.length === 1 ? "produto" : "produtos"} cadastrados
              {" · "}
              {ingredients.length} {ingredients.length === 1 ? "insumo" : "insumos"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => openCreateForm("ingredient")}
            >
              <Plus className="size-4" />
              Novo insumo
            </Button>
            <Button type="button" className="rounded-xl" onClick={() => openCreateForm("menu")}>
              <Plus className="size-4" />
              Novo item
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={kindFilter === "all" ? "default" : "outline"}
            className="rounded-xl"
            onClick={() => handleKindFilterChange("all")}
          >
            Todos
          </Button>
          <Button
            type="button"
            variant={kindFilter === "menu" ? "default" : "outline"}
            className="rounded-xl"
            onClick={() => handleKindFilterChange("menu")}
          >
            Cardápio
          </Button>
          <Button
            type="button"
            variant={kindFilter === "ingredient" ? "default" : "outline"}
            className="rounded-xl"
            onClick={() => handleKindFilterChange("ingredient")}
          >
            Insumos
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={filterCategory === "all" ? "default" : "outline"}
            className="rounded-xl"
            onClick={() => handleFilterChange("all")}
          >
            Todos
          </Button>
          {categoryNames.map((category) => (
            <Button
              key={category}
              type="button"
              variant={filterCategory === category ? "default" : "outline"}
              className="rounded-xl"
              onClick={() => handleFilterChange(category)}
            >
              {category}
            </Button>
          ))}
        </div>

        {filteredProducts.length === 0 ? (
          <div className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-border px-6 py-10">
            <p className="text-center text-muted-foreground">
              Nenhum produto encontrado. Clique em Novo produto para cadastrar.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left">
                  <th className="px-4 py-3 font-medium">Produto</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Categoria</th>
                  <th className="px-4 py-3 font-medium">Subcategoria</th>
                  <th className="px-4 py-3 font-medium">Estoque</th>
                  <th className="px-4 py-3 font-medium">Venda</th>
                  <th className="px-4 py-3 font-medium">Custo</th>
                  <th className="px-4 py-3 font-medium">Margem</th>
                  <th className="px-4 py-3 font-medium">Fornecedor</th>
                  <th className="px-4 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.map((product) => {
                  const margin = calculateProductMargin(product, products);
                  const supplierName = getSupplierName(suppliers, product.preferredSupplierId ?? undefined);

                  return (
                  <tr key={product.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Package className="size-4" />
                        </div>
                        <div>
                          <span className="font-medium text-foreground">{product.name}</span>
                          {hasRecipe(product) ? (
                            <RecipeSummary
                              product={product}
                              products={products}
                              className="mt-1 max-w-xs text-xs"
                            />
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-lg px-2 py-1 text-xs font-medium",
                          isIngredient(product)
                            ? "bg-amber-500/15 text-amber-700"
                            : hasRecipe(product)
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground",
                        )}
                      >
                        {isIngredient(product)
                          ? "Insumo"
                          : hasRecipe(product)
                            ? "Composto"
                            : "Simples"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{product.category}</td>
                    <td className="px-4 py-3 text-muted-foreground">{product.subcategory}</td>
                    <td className="px-4 py-3">
                      {hasRecipe(product) ? (
                        <span className="text-xs text-muted-foreground">Via ficha técnica</span>
                      ) : product.trackStock ? (
                        <div className="space-y-1">
                          <span className="font-medium text-foreground">
                            {formatStockAmount(product)}
                          </span>
                          {isOutOfStock(product) ? (
                            <span className="block text-xs font-medium text-destructive">
                              Esgotado
                            </span>
                          ) : isLowStock(product) ? (
                            <span className="block text-xs font-medium text-amber-600">
                              Baixo (mín. {product.minStock})
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Sem controle</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-primary">
                      {isIngredient(product) ? "—" : formatCurrency(product.price)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {product.lastPurchaseCost !== null && product.lastPurchaseCost !== undefined
                        ? formatCurrency(product.lastPurchaseCost)
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {margin.amount !== null && margin.percent !== null ? (
                        <div className="space-y-0.5">
                          <span className={cn("font-semibold", getMarginColorClass(margin))}>
                            {formatCurrency(margin.amount)}
                          </span>
                          <span className={cn("block text-xs", getMarginColorClass(margin))}>
                            {margin.percent.toFixed(1)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sem custo</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {supplierName ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          className="rounded-lg"
                          aria-label={`Histórico de compras de ${product.name}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            openPurchaseHistory(product);
                          }}
                        >
                          <History className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          className="rounded-lg"
                          aria-label={`Editar ${product.name}`}
                          onClick={() => openEditForm(product)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          className="rounded-lg text-destructive hover:text-destructive"
                          aria-label={`Excluir ${product.name}`}
                          onClick={() => {
                            setDeleteError("");
                            setDeleteTarget(product);
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredProducts.length > PAGE_SIZE ? (
              <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Mostrando {rangeStart}–{rangeEnd} de {filteredProducts.length} produtos
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    disabled={effectivePage <= 1}
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  >
                    Anterior
                  </Button>

                  <span className="min-w-24 text-center text-sm font-medium text-foreground">
                    Página {effectivePage} de {totalPages}
                  </span>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    disabled={effectivePage >= totalPages}
                    onClick={() =>
                      setCurrentPage((page) => Math.min(totalPages, page + 1))
                    }
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent
          className={cn(
            "max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:max-w-md",
            form.kind === "menu" && form.usesRecipe && "sm:max-w-2xl",
          )}
        >
          <DialogHeader>
            <DialogTitle className="text-xl">
              {editingProduct
                ? isIngredient(editingProduct)
                  ? "Editar insumo"
                  : "Editar item do cardápio"
                : form.kind === "ingredient"
                  ? "Novo insumo"
                  : "Novo item do cardápio"}
            </DialogTitle>
            <DialogDescription>
              {form.kind === "ingredient"
                ? "Insumos controlam estoque e entram nas fichas técnicas dos itens compostos."
                : "Itens do cardápio são vendidos nas mesas. Use ficha técnica para produtos compostos."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            {!editingProduct ? (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={form.kind === "menu" ? "default" : "outline"}
                  className="flex-1 rounded-xl"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      kind: "menu",
                      usesRecipe: false,
                      recipe: [],
                    }))
                  }
                >
                  Cardápio
                </Button>
                <Button
                  type="button"
                  variant={form.kind === "ingredient" ? "default" : "outline"}
                  className="flex-1 rounded-xl"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      kind: "ingredient",
                      usesRecipe: false,
                      recipe: [],
                      trackStock: true,
                    }))
                  }
                >
                  Insumo
                </Button>
              </div>
            ) : null}
            <div className="space-y-2">
              <label htmlFor="product-name" className="text-sm font-medium">
                Nome
              </label>
              <Input
                id="product-name"
                value={form.name}
                onChange={(event) => {
                  setForm((current) => ({ ...current, name: event.target.value }));
                  setFormError("");
                }}
                className="h-11 rounded-xl px-3"
                placeholder="Ex.: Bruschetta"
                autoFocus
              />
            </div>

            {form.kind === "menu" ? (
              <div className="space-y-2">
                <label htmlFor="product-price" className="text-sm font-medium">
                  Preço de venda
                </label>
                <Input
                  id="product-price"
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={form.price}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, price: event.target.value }));
                    setFormError("");
                  }}
                  className="h-11 rounded-xl px-3"
                  placeholder="0,00"
                />

                <div className="rounded-2xl border border-border bg-muted/30 p-4 text-sm">
                  <p className="font-medium text-foreground">Lucro por unidade</p>
                  {previewCost !== null && previewCost !== undefined ? (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">
                          {form.usesRecipe ? "Custo da ficha técnica" : "Custo (última compra)"}
                        </span>
                        <span className="font-medium text-foreground">
                          {formatCurrency(previewCost)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Preço de venda</span>
                        <span className="font-medium text-foreground">
                          {Number.isFinite(previewSalePrice) && previewSalePrice > 0
                            ? formatCurrency(previewSalePrice)
                            : "—"}
                        </span>
                      </div>
                      <div className="border-t border-border pt-2">
                        {previewMargin.amount !== null && previewMargin.percent !== null ? (
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-medium text-foreground">Lucro</span>
                            <div className="text-right">
                              <span className={cn("font-semibold", getMarginColorClass(previewMargin))}>
                                {formatCurrency(previewMargin.amount)}
                              </span>
                              <span
                                className={cn("ml-2 text-xs font-medium", getMarginColorClass(previewMargin))}
                              >
                                ({previewMargin.percent.toFixed(1)}%)
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-muted-foreground">
                            Informe um preço de venda válido para ver o lucro.
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-muted-foreground">
                      {form.usesRecipe
                        ? "Registre compras dos insumos para calcular o custo da ficha técnica."
                        : "Sem custo registrado. O lucro será calculado após a primeira compra em Estoque."}
                    </p>
                  )}
                </div>
              </div>
            ) : null}

            {editingProduct ? (
              <div className="rounded-2xl border border-border bg-muted/30 p-4 text-sm">
                <p className="font-medium text-foreground">Fornecedor da última compra</p>
                <p className="mt-2 font-medium text-foreground">
                  {getSupplierName(
                    suppliers,
                    productForPreview?.preferredSupplierId ?? undefined,
                  ) ?? "—"}
                </p>
              </div>
            ) : null}

            {form.kind === "menu" ? (
              <div className="space-y-3 rounded-2xl border border-border p-4">
                <label className="flex items-center gap-3 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={form.usesRecipe}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        usesRecipe: event.target.checked,
                        recipe: event.target.checked ? current.recipe : [],
                        trackStock: event.target.checked ? false : current.trackStock,
                      }))
                    }
                    className="size-4 rounded border-input"
                  />
                  Produto composto (ficha técnica)
                </label>

                {form.usesRecipe ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Defina os insumos consumidos por cada unidade vendida.
                    </p>
                    <RecipeEditor
                      recipe={form.recipe}
                      ingredients={ingredients}
                      onChange={(recipe) => setForm((current) => ({ ...current, recipe }))}
                    />
                  </div>
                ) : (
                  <label className="flex items-center gap-3 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={form.trackStock}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          trackStock: event.target.checked,
                        }))
                      }
                      className="size-4 rounded border-input"
                    />
                    Controlar estoque deste produto
                  </label>
                )}

                {!form.usesRecipe && form.trackStock ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="product-stock" className="text-sm font-medium">
                        Estoque atual
                      </label>
                      <Input
                        id="product-stock"
                        type="number"
                        min={0}
                        step={1}
                        value={form.stockQuantity}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            stockQuantity: event.target.value,
                          }))
                        }
                        className="h-11 rounded-xl px-3"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="product-min-stock" className="text-sm font-medium">
                        Estoque mínimo
                      </label>
                      <Input
                        id="product-min-stock"
                        type="number"
                        min={0}
                        step={1}
                        value={form.minStock}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            minStock: event.target.value,
                          }))
                        }
                        className="h-11 rounded-xl px-3"
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-4 rounded-2xl border border-border p-4">
                <div className="space-y-2">
                  <label htmlFor="ingredient-stock-unit" className="text-sm font-medium">
                    Unidade de estoque
                  </label>
                  <select
                    id="ingredient-stock-unit"
                    value={form.stockUnit}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        stockUnit: event.target.value as StockUnit,
                        usesPackage: event.target.value === "un" ? current.usesPackage : false,
                      }))
                    }
                    className="h-11 w-full rounded-xl border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {(Object.keys(STOCK_UNIT_LABELS) as StockUnit[]).map((unit) => (
                      <option key={unit} value={unit}>
                        {STOCK_UNIT_LABELS[unit]}
                      </option>
                    ))}
                  </select>
                </div>

                {form.stockUnit === "un" ? (
                  <div className="space-y-3 rounded-xl border border-dashed border-border p-3">
                    <label className="flex items-center gap-3 text-sm font-medium">
                      <input
                        type="checkbox"
                        checked={form.usesPackage}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            usesPackage: event.target.checked,
                          }))
                        }
                        className="size-4 rounded border-input"
                      />
                      Comprado em embalagens (ex.: garrafa, caixa)
                    </label>

                    {form.usesPackage ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label htmlFor="package-size" className="text-sm font-medium">
                            Tamanho da embalagem
                          </label>
                          <Input
                            id="package-size"
                            type="number"
                            min={0.01}
                            step={0.01}
                            value={form.packageSize}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                packageSize: event.target.value,
                              }))
                            }
                            className="h-11 rounded-xl px-3"
                            placeholder="Ex.: 70"
                          />
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="package-unit" className="text-sm font-medium">
                            Unidade da embalagem
                          </label>
                          <select
                            id="package-unit"
                            value={form.packageUnit}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                packageUnit: event.target.value as StockUnit,
                              }))
                            }
                            className="h-11 w-full rounded-xl border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                          >
                            <option value="ml">Mililitro (ml)</option>
                            <option value="cl">Centilitro (cl)</option>
                            <option value="L">Litro (L)</option>
                            <option value="g">Grama (g)</option>
                            <option value="kg">Quilograma (kg)</option>
                          </select>
                        </div>
                        <p className="sm:col-span-2 text-xs text-muted-foreground">
                          Ex.: garrafa de vinho do Porto com 70 cl — estoque em garrafas, ficha
                          técnica em cl por dose.
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <p className="text-sm font-medium text-foreground">Controle de estoque</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="ingredient-stock" className="text-sm font-medium">
                      Estoque atual ({ingredientStockLabel})
                    </label>
                    <Input
                      id="ingredient-stock"
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.stockQuantity}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          stockQuantity: event.target.value,
                        }))
                      }
                      className="h-11 rounded-xl px-3"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="ingredient-min-stock" className="text-sm font-medium">
                      Estoque mínimo ({ingredientStockLabel})
                    </label>
                    <Input
                      id="ingredient-min-stock"
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.minStock}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          minStock: event.target.value,
                        }))
                      }
                      className="h-11 rounded-xl px-3"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="product-category" className="text-sm font-medium">
                Categoria
              </label>
              <select
                id="product-category"
                value={form.category}
                onChange={(event) => handleCategoryChange(event.target.value)}
                className="h-11 w-full rounded-xl border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {categoryNames.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="product-subcategory" className="text-sm font-medium">
                Subcategoria
              </label>
              {subcategoryOptions.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
                  Esta categoria não possui subcategorias. Cadastre uma subcategoria primeiro.
                </p>
              ) : (
                <select
                  id="product-subcategory"
                  value={form.subcategory}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      subcategory: event.target.value,
                    }))
                  }
                  className={cn(
                    "h-11 w-full rounded-xl border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                  )}
                >
                  {subcategoryOptions.map((subcategory) => (
                    <option key={subcategory.id} value={subcategory.name}>
                      {subcategory.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

            <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => setFormOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="rounded-xl"
                disabled={subcategoryOptions.length === 0}
              >
                {editingProduct ? "Salvar" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <PurchaseHistoryDialog
        open={historyOpen}
        onOpenChange={(open) => {
          if (!open) {
            closePurchaseHistory();
          }
        }}
        title={historyProduct ? `Compras — ${historyProduct.name}` : "Histórico de compras"}
        description="Compare preços e fornecedores ao longo do tempo."
        records={historyProduct ? getHistoryForProduct(historyProduct.id) : []}
        insights={historyProduct ? getInsightsForProduct(historyProduct.id) : null}
        formatCurrency={formatCurrency}
      />

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteError("");
          }
        }}
      >
        <DialogContent className="max-w-md rounded-3xl p-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Excluir produto</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `Deseja excluir "${deleteTarget.name}"? Esta ação não pode ser desfeita.`
                : null}
            </DialogDescription>
          </DialogHeader>

          {deleteError ? <p className="text-sm text-destructive">{deleteError}</p> : null}

          <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => setDeleteTarget(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-xl"
              onClick={handleDeleteConfirm}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
