"use client";

import { useMemo, useState } from "react";
import { Minus, Package, Plus } from "lucide-react";

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
import { PriceComparisonAlert } from "@/features/purchases/components/PurchaseHistoryDialog";
import { usePurchases } from "@/features/purchases/hooks/usePurchases";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { useStock } from "@/features/stock/hooks/useStock";
import { formatStockAmount, getPurchaseUnitLabel } from "@/features/stock/utils/stockUnits";
import type { StockFilter } from "@/features/stock/types";
import { isLowStock, isOutOfStock } from "@/features/stock/utils/productStock";
import { useSuppliers } from "@/features/suppliers/hooks/useSuppliers";
import type { Product } from "@/features/tables/types";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

const FILTER_OPTIONS: { value: StockFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "low", label: "Estoque baixo" },
  { value: "out", label: "Esgotados" },
];

function getTodayDateInput(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function AdminStockPage() {
  const { formatCurrency } = useSettings();
  const { suppliers } = useSuppliers();
  const { recordProductPurchase, comparePriceForProduct } = usePurchases();
  const { trackedProducts, lowStockCount, outOfStockCount, getFilteredProducts, adjustStock } =
    useStock();

  const [filter, setFilter] = useState<StockFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [adjustTarget, setAdjustTarget] = useState<Product | null>(null);
  const [adjustMode, setAdjustMode] = useState<"restock" | "adjustment">("restock");
  const [adjustQuantity, setAdjustQuantity] = useState("1");
  const [adjustReason, setAdjustReason] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [purchasedAt, setPurchasedAt] = useState(getTodayDateInput());
  const [purchaseNotes, setPurchaseNotes] = useState("");
  const [adjustError, setAdjustError] = useState("");

  const filteredProducts = useMemo(
    () =>
      getFilteredProducts(filter).sort((a, b) => a.name.localeCompare(b.name, "pt-PT")),
    [filter, getFilteredProducts],
  );

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const effectivePage = Math.min(currentPage, totalPages);

  const paginatedProducts = useMemo(() => {
    const start = (effectivePage - 1) * PAGE_SIZE;
    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [filteredProducts, effectivePage]);

  const rangeStart =
    filteredProducts.length === 0 ? 0 : (effectivePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(effectivePage * PAGE_SIZE, filteredProducts.length);

  const parsedUnitCost = Number.parseFloat(unitCost.replace(",", "."));
  const parsedQuantity = Number.parseInt(adjustQuantity, 10);

  const priceComparison = useMemo(() => {
    if (!adjustTarget || adjustMode !== "restock" || !Number.isFinite(parsedUnitCost)) {
      return null;
    }

    return comparePriceForProduct(adjustTarget.id, parsedUnitCost);
  }, [adjustTarget, adjustMode, parsedUnitCost, comparePriceForProduct]);

  const purchaseTotal = useMemo(() => {
    if (!Number.isFinite(parsedUnitCost) || !Number.isFinite(parsedQuantity)) {
      return null;
    }

    return parsedUnitCost * parsedQuantity;
  }, [parsedUnitCost, parsedQuantity]);

  function handleFilterChange(nextFilter: StockFilter) {
    setFilter(nextFilter);
    setCurrentPage(1);
  }

  function resetAdjustForm() {
    setAdjustQuantity("1");
    setAdjustReason("");
    setSupplierId(suppliers[0]?.id ?? "");
    setUnitCost("");
    setPurchasedAt(getTodayDateInput());
    setPurchaseNotes("");
    setAdjustError("");
  }

  function openAdjust(product: Product, mode: "restock" | "adjustment") {
    setAdjustTarget(product);
    setAdjustMode(mode);
    resetAdjustForm();

    if (mode === "restock" && product.preferredSupplierId) {
      setSupplierId(product.preferredSupplierId);
    }

    if (mode === "restock" && product.lastPurchaseCost !== null && product.lastPurchaseCost !== undefined) {
      setUnitCost(String(product.lastPurchaseCost));
    }
  }

  async function handleAdjustSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!adjustTarget) {
      return;
    }

    const quantity = Number.parseInt(adjustQuantity, 10);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setAdjustError("Informe uma quantidade válida maior que zero.");
      return;
    }

    if (adjustMode === "restock") {
      const cost = Number.parseFloat(unitCost.replace(",", "."));
      if (!Number.isFinite(cost) || cost < 0) {
        setAdjustError("Informe um preço de compra válido.");
        return;
      }

      if (!supplierId) {
        setAdjustError("Selecione um fornecedor.");
        return;
      }

      const result = await recordProductPurchase({
        productId: adjustTarget.id,
        supplierId,
        unitCost: cost,
        quantity,
        purchasedAt,
        notes: purchaseNotes || undefined,
      });

      if (!result.ok) {
        setAdjustError(result.error ?? "Não foi possível registrar a compra.");
        return;
      }
    } else {
      const result = await adjustStock(adjustTarget.id, -quantity, "adjustment", adjustReason);
      if (!result.ok) {
        setAdjustError(result.error ?? "Não foi possível ajustar o estoque.");
        return;
      }
    }

    setAdjustTarget(null);
    resetAdjustForm();
  }

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b border-border bg-card px-6 py-4">
        <h2 className="font-heading text-xl font-bold text-foreground">Estoque</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {trackedProducts.length} produtos com controle de estoque
        </p>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-elevated">
            <p className="text-sm text-muted-foreground">Com controle</p>
            <p className="mt-1 font-heading text-2xl font-bold text-foreground">
              {trackedProducts.length}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-elevated">
            <p className="text-sm text-muted-foreground">Estoque baixo</p>
            <p className="mt-1 font-heading text-2xl font-bold text-amber-600">
              {lowStockCount}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-elevated">
            <p className="text-sm text-muted-foreground">Esgotados</p>
            <p className="mt-1 font-heading text-2xl font-bold text-destructive">
              {outOfStockCount}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant={filter === option.value ? "default" : "outline"}
              className="rounded-xl"
              onClick={() => handleFilterChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>

        {filteredProducts.length === 0 ? (
          <div className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-border px-6 py-10">
            <p className="text-center text-muted-foreground">
              Nenhum produto encontrado para este filtro.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left">
                  <th className="px-4 py-3 font-medium">Produto</th>
                  <th className="px-4 py-3 font-medium">Categoria</th>
                  <th className="px-4 py-3 font-medium">Atual</th>
                  <th className="px-4 py-3 font-medium">Custo</th>
                  <th className="px-4 py-3 font-medium">Mínimo</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.map((product) => (
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
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {formatStockAmount(product)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {product.lastPurchaseCost !== null && product.lastPurchaseCost !== undefined
                        ? `${formatCurrency(product.lastPurchaseCost)} / ${getPurchaseUnitLabel(product)}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatStockAmount(product, product.minStock)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                          isOutOfStock(product)
                            ? "bg-destructive/15 text-destructive"
                            : isLowStock(product)
                              ? "bg-amber-500/15 text-amber-700"
                              : "bg-muted text-muted-foreground",
                        )}
                      >
                        {isOutOfStock(product)
                          ? "Esgotado"
                          : isLowStock(product)
                            ? "Baixo"
                            : "Normal"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-lg"
                          onClick={() => openAdjust(product, "restock")}
                        >
                          <Plus className="size-3.5" />
                          Entrada
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-lg"
                          onClick={() => openAdjust(product, "adjustment")}
                        >
                          <Minus className="size-3.5" />
                          Saída
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
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

      <Dialog
        open={adjustTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAdjustTarget(null);
            setAdjustError("");
          }
        }}
      >
        <DialogContent className="max-w-md rounded-3xl p-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {adjustMode === "restock" ? "Registrar compra" : "Saída de estoque"}
            </DialogTitle>
            <DialogDescription>
              {adjustTarget
                ? `${adjustTarget.name} — estoque atual: ${formatStockAmount(adjustTarget)}`
                : null}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAdjustSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="adjust-quantity" className="text-sm font-medium">
                Quantidade
                {adjustTarget ? ` (${getPurchaseUnitLabel(adjustTarget)})` : ""}
              </label>
              <Input
                id="adjust-quantity"
                type="number"
                min={0.01}
                step={adjustTarget?.stockUnit === "un" && !adjustTarget.packageSize ? 1 : 0.01}
                value={adjustQuantity}
                onChange={(event) => {
                  setAdjustQuantity(event.target.value);
                  setAdjustError("");
                }}
                className="h-11 rounded-xl px-3"
              />
            </div>

            {adjustMode === "restock" ? (
              <>
                <div className="space-y-2">
                  <label htmlFor="purchase-supplier" className="text-sm font-medium">
                    Fornecedor
                  </label>
                  {suppliers.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
                      Cadastre um fornecedor antes de registrar compras.
                    </p>
                  ) : (
                    <select
                      id="purchase-supplier"
                      value={supplierId}
                      onChange={(event) => {
                        setSupplierId(event.target.value);
                        setAdjustError("");
                      }}
                      className="h-11 w-full rounded-xl border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="purchase-unit-cost" className="text-sm font-medium">
                      Preço por {adjustTarget ? getPurchaseUnitLabel(adjustTarget) : "unidade"}
                    </label>
                    <Input
                      id="purchase-unit-cost"
                      type="number"
                      min={0}
                      step={0.01}
                      value={unitCost}
                      onChange={(event) => {
                        setUnitCost(event.target.value);
                        setAdjustError("");
                      }}
                      className="h-11 rounded-xl px-3"
                      placeholder="0,00"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="purchase-date" className="text-sm font-medium">
                      Data da compra
                    </label>
                    <Input
                      id="purchase-date"
                      type="date"
                      value={purchasedAt}
                      onChange={(event) => {
                        setPurchasedAt(event.target.value);
                        setAdjustError("");
                      }}
                      className="h-11 rounded-xl px-3"
                    />
                  </div>
                </div>

                <PriceComparisonAlert comparison={priceComparison} formatCurrency={formatCurrency} />

                {purchaseTotal !== null ? (
                  <p className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm">
                    Total da compra:{" "}
                    <span className="font-semibold text-foreground">
                      {formatCurrency(purchaseTotal)}
                    </span>
                  </p>
                ) : null}

                <div className="space-y-2">
                  <label htmlFor="purchase-notes" className="text-sm font-medium">
                    Observações (opcional)
                  </label>
                  <Input
                    id="purchase-notes"
                    value={purchaseNotes}
                    onChange={(event) => {
                      setPurchaseNotes(event.target.value);
                      setAdjustError("");
                    }}
                    className="h-11 rounded-xl px-3"
                    placeholder="Ex.: Promoção fim de semana"
                  />
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <label htmlFor="adjust-reason" className="text-sm font-medium">
                  Motivo
                </label>
                <Input
                  id="adjust-reason"
                  value={adjustReason}
                  onChange={(event) => {
                    setAdjustReason(event.target.value);
                    setAdjustError("");
                  }}
                  className="h-11 rounded-xl px-3"
                  placeholder="Ex.: Perda ou quebra"
                />
              </div>
            )}

            {adjustError ? <p className="text-sm text-destructive">{adjustError}</p> : null}

            <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => setAdjustTarget(null)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="rounded-xl"
                disabled={adjustMode === "restock" && suppliers.length === 0}
              >
                {adjustMode === "restock" ? "Registrar compra" : "Confirmar saída"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
