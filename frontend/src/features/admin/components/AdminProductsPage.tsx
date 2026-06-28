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
import { useProductAdmin } from "@/features/menu/hooks/useProductAdmin";
import { getSubcategoryNames } from "@/features/menu/services/menuCatalogStorage";
import { PurchaseHistoryDialog } from "@/features/purchases/components/PurchaseHistoryDialog";
import { usePurchases } from "@/features/purchases/hooks/usePurchases";
import {
  calculateMargin,
  calculateProductMargin,
  getMarginColorClass,
} from "@/features/purchases/utils/margin";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { isLowStock, isOutOfStock } from "@/features/stock/utils/productStock";
import { useSuppliers } from "@/features/suppliers/hooks/useSuppliers";
import { getSupplierName } from "@/features/suppliers/services/supplierService";
import { cn } from "@/lib/utils";
import type { Product } from "@/features/tables/types";

interface ProductFormState {
  name: string;
  price: string;
  category: string;
  subcategory: string;
  trackStock: boolean;
  stockQuantity: string;
  minStock: string;
}

const EMPTY_FORM: ProductFormState = {
  name: "",
  price: "",
  category: "",
  subcategory: "",
  trackStock: true,
  stockQuantity: "50",
  minStock: "5",
};

const PAGE_SIZE = 10;

export function AdminProductsPage() {
  const { formatCurrency } = useSettings();
  const { categories } = useMenuCatalog();
  const { suppliers } = useSuppliers();
  const { getHistoryForProduct, getInsightsForProduct } = usePurchases();
  const { products, createProduct, updateProduct, deleteProduct } = useProductAdmin();

  const categoryNames = categories.map((category) => category.name);
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

  const subcategoryOptions = getSubcategoryNames(categories, form.category);

  const filteredProducts = useMemo(() => {
    const sorted = [...products].sort((a, b) => a.name.localeCompare(b.name, "pt-PT"));

    if (filterCategory === "all") {
      return sorted;
    }

    return sorted.filter((product) => product.category === filterCategory);
  }, [products, filterCategory]);

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
  const previewCost = productForPreview?.lastPurchaseCost ?? null;

  const previewMargin = useMemo(() => {
    if (!Number.isFinite(previewSalePrice) || previewSalePrice <= 0) {
      return { amount: null, percent: null };
    }

    return calculateMargin(previewSalePrice, previewCost);
  }, [previewSalePrice, previewCost]);

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

  function openCreateForm() {
    const category = getDefaultCategory();
    setEditingProduct(null);
    setForm({
      name: "",
      price: "",
      category,
      subcategory: getDefaultSubcategory(category),
      trackStock: true,
      stockQuantity: "50",
      minStock: "5",
    });
    setFormError("");
    setFormOpen(true);
  }

  function openEditForm(product: Product) {
    setEditingProduct(product);
    setForm({
      name: product.name,
      price: String(product.price),
      category: product.category,
      subcategory: product.subcategory,
      trackStock: product.trackStock,
      stockQuantity: String(product.stockQuantity),
      minStock: String(product.minStock),
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

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const price = Number.parseFloat(form.price.replace(",", "."));
    const stockQuantity = Number.parseInt(form.stockQuantity, 10);
    const minStock = Number.parseInt(form.minStock, 10);
    const input = {
      name: form.name,
      price,
      category: form.category,
      subcategory: form.subcategory,
      trackStock: form.trackStock,
      stockQuantity,
      minStock,
    };

    const result = editingProduct
      ? updateProduct(editingProduct.id, input)
      : createProduct(input);

    if (!result.ok) {
      setFormError(result.error ?? "Não foi possível salvar o produto.");
      return;
    }

    setFormOpen(false);
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setFormError("");
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) {
      return;
    }

    const result = deleteProduct(deleteTarget.id);
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
            </p>
          </div>
          <Button type="button" className="rounded-xl" onClick={openCreateForm}>
            <Plus className="size-4" />
            Novo produto
          </Button>
        </div>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
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
                  const margin = calculateProductMargin(product);
                  const supplierName = getSupplierName(suppliers, product.preferredSupplierId ?? undefined);

                  return (
                  <tr key={product.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Package className="size-4" />
                        </div>
                        <span className="font-medium text-foreground">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{product.category}</td>
                    <td className="px-4 py-3 text-muted-foreground">{product.subcategory}</td>
                    <td className="px-4 py-3">
                      {product.trackStock ? (
                        <div className="space-y-1">
                          <span className="font-medium text-foreground">
                            {product.stockQuantity}
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
                      {formatCurrency(product.price)}
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
        <DialogContent className="max-w-md rounded-3xl p-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {editingProduct ? "Editar produto" : "Novo produto"}
            </DialogTitle>
            <DialogDescription>
              {editingProduct
                ? "Altere os dados do produto no cardápio."
                : "Preencha os dados para cadastrar um novo produto."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4">
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
                      <span className="text-muted-foreground">Custo (última compra)</span>
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
                    Sem custo registrado. O lucro será calculado após a primeira compra em
                    Estoque.
                  </p>
                )}
              </div>
            </div>

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

            <div className="space-y-3 rounded-2xl border border-border p-4">
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

              {form.trackStock ? (
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
                    <option key={subcategory} value={subcategory}>
                      {subcategory}
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
