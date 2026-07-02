"use client";

import { useMemo, useState } from "react";
import { FolderTree, Pencil, Plus, Trash2 } from "lucide-react";

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
import type { MenuCatalogActionResult, MenuCategory } from "@/features/menu/types";

type FormMode =
  | { type: "category-create" }
  | { type: "category-edit"; category: MenuCategory }
  | { type: "subcategory-create"; category: MenuCategory }
  | { type: "subcategory-edit"; category: MenuCategory; subcategoryId: string; subcategoryName: string };

interface DeleteTarget {
  type: "category" | "subcategory";
  categoryId: string;
  subcategoryId?: string;
  label: string;
}

export function AdminCategoriesPage() {
  const {
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    addSubcategory,
    updateSubcategory,
    deleteSubcategory,
  } = useMenuCatalog();

  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [formName, setFormName] = useState("");
  const [formError, setFormError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredCategories = useMemo(
    () =>
      categories.filter((category) => {
        if (!normalizedSearchQuery) {
          return true;
        }

        if (category.name.toLowerCase().includes(normalizedSearchQuery)) {
          return true;
        }

        return category.subcategories.some((subcategory) =>
          subcategory.name.toLowerCase().includes(normalizedSearchQuery),
        );
      }),
    [categories, normalizedSearchQuery],
  );

  function openCategoryCreate() {
    setFormMode({ type: "category-create" });
    setFormName("");
    setFormError("");
  }

  function openCategoryEdit(category: MenuCategory) {
    setFormMode({ type: "category-edit", category });
    setFormName(category.name);
    setFormError("");
  }

  function openSubcategoryCreate(category: MenuCategory) {
    setFormMode({ type: "subcategory-create", category });
    setFormName("");
    setFormError("");
  }

  function openSubcategoryEdit(
    category: MenuCategory,
    subcategoryId: string,
    subcategoryName: string,
  ) {
    setFormMode({
      type: "subcategory-edit",
      category,
      subcategoryId,
      subcategoryName,
    });
    setFormName(subcategoryName);
    setFormError("");
  }

  async function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formMode) {
      return;
    }

    let result: MenuCatalogActionResult;

    switch (formMode.type) {
      case "category-create":
        result = await addCategory(formName);
        break;
      case "category-edit":
        result = await updateCategory(formMode.category.id, formName);
        break;
      case "subcategory-create":
        result = await addSubcategory(formMode.category.id, formName);
        break;
      case "subcategory-edit":
        result = await updateSubcategory(formMode.category.id, formMode.subcategoryId, formName);
        break;
      default:
        return;
    }

    if (!result.ok) {
      setFormError(result.error ?? "Não foi possível salvar.");
      return;
    }

    setFormMode(null);
    setFormName("");
    setFormError("");
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) {
      return;
    }

    const result =
      deleteTarget.type === "category"
        ? await deleteCategory(deleteTarget.categoryId)
        : await deleteSubcategory(deleteTarget.categoryId, deleteTarget.subcategoryId ?? "");

    if (!result.ok) {
      setDeleteError(result.error ?? "Não foi possível excluir.");
      return;
    }

    setDeleteTarget(null);
    setDeleteError("");
  }

  function getFormTitle(): string {
    if (!formMode) {
      return "";
    }

    switch (formMode.type) {
      case "category-create":
        return "Nova categoria";
      case "category-edit":
        return "Editar categoria";
      case "subcategory-create":
        return "Nova subcategoria";
      case "subcategory-edit":
        return "Editar subcategoria";
      default:
        return "";
    }
  }

  function getFormDescription(): string {
    if (!formMode) {
      return "";
    }

    switch (formMode.type) {
      case "category-create":
        return "Informe o nome da nova categoria do cardápio.";
      case "category-edit":
        return "Altere o nome da categoria.";
      case "subcategory-create":
        return `Adicionar subcategoria em ${formMode.category.name}.`;
      case "subcategory-edit":
        return `Alterar subcategoria em ${formMode.category.name}.`;
      default:
        return "";
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b border-border bg-card px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-heading text-xl font-bold text-foreground">
              Categorias e subcategorias
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Organize o cardápio em categorias e subcategorias.
            </p>
          </div>
          <Button type="button" className="rounded-xl" onClick={openCategoryCreate}>
            <Plus className="size-4" />
            Nova categoria
          </Button>
        </div>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Buscar categoria ou subcategoria"
          className="h-10 max-w-md rounded-xl px-3"
        />

        {filteredCategories.length === 0 ? (
          <div className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-border px-6 py-10">
            <p className="text-center text-muted-foreground">
              {categories.length === 0
                ? "Nenhuma categoria cadastrada. Crie a primeira categoria do cardápio."
                : "Nenhuma categoria encontrada para a busca."}
            </p>
          </div>
        ) : (
          filteredCategories.map((category) => {
            const isCategoryMatch = category.name
              .toLowerCase()
              .includes(normalizedSearchQuery);
            const visibleSubcategories =
              normalizedSearchQuery && !isCategoryMatch
                ? category.subcategories.filter((subcategory) =>
                    subcategory.name.toLowerCase().includes(normalizedSearchQuery),
                  )
                : category.subcategories;

            return (
            <section
              key={category.id}
              className="overflow-hidden rounded-3xl border border-border bg-card shadow-elevated"
            >
              <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <FolderTree className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-semibold text-foreground">
                      {category.name}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {visibleSubcategories.length}{" "}
                      {visibleSubcategories.length === 1
                        ? "subcategoria"
                        : "subcategorias"}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="rounded-lg"
                    aria-label={`Editar categoria ${category.name}`}
                    onClick={() => openCategoryEdit(category)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="rounded-lg text-destructive hover:text-destructive"
                    aria-label={`Excluir categoria ${category.name}`}
                    onClick={() => {
                      setDeleteError("");
                      setDeleteTarget({
                        type: "category",
                        categoryId: category.id,
                        label: category.name,
                      });
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>

              <div className="px-5 py-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold text-foreground">Subcategorias</h4>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => openSubcategoryCreate(category)}
                  >
                    <Plus className="size-4" />
                    Adicionar
                  </Button>
                </div>

                {visibleSubcategories.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                    Nenhuma subcategoria nesta categoria.
                  </p>
                ) : (
                  <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
                    {visibleSubcategories.map((subcategory) => (
                      <li
                        key={subcategory.id}
                        className="flex items-center justify-between gap-3 px-4 py-3"
                      >
                        <span className="font-medium text-foreground">{subcategory.name}</span>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            className="rounded-lg"
                            aria-label={`Editar subcategoria ${subcategory.name}`}
                            onClick={() =>
                              openSubcategoryEdit(
                                category,
                                subcategory.id,
                                subcategory.name,
                              )
                            }
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            className="rounded-lg text-destructive hover:text-destructive"
                            aria-label={`Excluir subcategoria ${subcategory.name}`}
                            onClick={() => {
                              setDeleteError("");
                              setDeleteTarget({
                                type: "subcategory",
                                categoryId: category.id,
                                subcategoryId: subcategory.id,
                                label: `${category.name} › ${subcategory.name}`,
                              });
                            }}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          );
          })
        )}
      </div>

      <Dialog open={formMode !== null} onOpenChange={(open) => !open && setFormMode(null)}>
        <DialogContent className="max-w-md rounded-3xl p-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">{getFormTitle()}</DialogTitle>
            <DialogDescription>{getFormDescription()}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="catalog-name" className="text-sm font-medium">
                Nome
              </label>
              <Input
                id="catalog-name"
                value={formName}
                onChange={(event) => {
                  setFormName(event.target.value);
                  setFormError("");
                }}
                className="h-11 rounded-xl px-3"
                placeholder="Digite o nome"
                autoFocus
              />
            </div>

            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

            <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => setFormMode(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="rounded-xl">
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
            <DialogTitle className="text-xl">
              Excluir {deleteTarget?.type === "category" ? "categoria" : "subcategoria"}
            </DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `Deseja excluir ${deleteTarget.label}? Esta ação não pode ser desfeita.`
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
