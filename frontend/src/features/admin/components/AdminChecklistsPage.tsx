"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatReportDate, parseLocalDateKey } from "@/features/sales/utils/formatReportDate";
import { cn } from "@/lib/utils";

import { useChecklistAdmin } from "@/features/checklists/hooks/useChecklistAdmin";
import { useDailyChecklist } from "@/features/checklists/hooks/useDailyChecklist";
import type {
  ChecklistDaysFilter,
  ChecklistItem,
  ChecklistType,
  DayOfWeek,
} from "@/features/checklists/types";
import {
  CHECKLIST_TYPE_LABELS,
  DAY_OF_WEEK_SHORT_LABELS,
} from "@/features/checklists/types";
import { formatDaysFilter } from "@/features/checklists/utils/checklistTimeWindow";
import {
  ChecklistItemsGroup,
  ChecklistTimeWindowBadge,
} from "@/features/checklists/components/ChecklistItemsGroup";
import { ChecklistProgressBar } from "@/features/checklists/components/ChecklistProgressBar";

type AdminTab = "items" | "history";
type FormMode =
  | { type: "create"; templateId: string }
  | { type: "edit"; item: ChecklistItem };

const ALL_DAYS: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6];

function daysFilterToSelection(daysOfWeek: ChecklistDaysFilter): DayOfWeek[] {
  return daysOfWeek === "all" ? [...ALL_DAYS] : daysOfWeek;
}

function selectionToDaysFilter(selected: DayOfWeek[]): ChecklistDaysFilter {
  if (selected.length === ALL_DAYS.length) {
    return "all";
  }

  return selected.sort((left, right) => left - right);
}

export function AdminChecklistsPage() {
  const {
    historyDays,
    getItemsByTemplate,
    getTemplateByType,
    addItem,
    editItem,
    removeItem,
    reorderItem,
    editTemplate,
  } = useChecklistAdmin();

  const [activeTab, setActiveTab] = useState<AdminTab>("items");
  const [activeType, setActiveType] = useState<ChecklistType>("opening");
  const [selectedHistoryDateKey, setSelectedHistoryDateKey] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [formLabel, setFormLabel] = useState("");
  const [formDays, setFormDays] = useState<DayOfWeek[]>([...ALL_DAYS]);
  const [formActive, setFormActive] = useState(true);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ChecklistItem | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [templateDrafts, setTemplateDrafts] = useState<
    Record<string, { start: string; end: string }>
  >({});
  const [templateError, setTemplateError] = useState("");

  const activeTemplate = getTemplateByType(activeType);
  const activeItems = activeTemplate ? getItemsByTemplate(activeTemplate.id) : [];
  const activeTemplateDraft = activeTemplate
    ? (templateDrafts[activeTemplate.id] ?? {
        start: activeTemplate.timeWindowStart,
        end: activeTemplate.timeWindowEnd,
      })
    : null;

  const historyView = useDailyChecklist(selectedHistoryDateKey ?? undefined);

  function openCreateForm() {
    if (!activeTemplate) {
      return;
    }

    setFormMode({ type: "create", templateId: activeTemplate.id });
    setFormLabel("");
    setFormDays([...ALL_DAYS]);
    setFormActive(true);
    setFormError("");
  }

  function openEditForm(item: ChecklistItem) {
    setFormMode({ type: "edit", item });
    setFormLabel(item.label);
    setFormDays(daysFilterToSelection(item.daysOfWeek));
    setFormActive(item.active);
    setFormError("");
  }

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formMode) {
      return;
    }

    const daysOfWeek = selectionToDaysFilter(formDays);
    const result =
      formMode.type === "create"
        ? addItem({
            templateId: formMode.templateId,
            label: formLabel,
            daysOfWeek,
          })
        : editItem(formMode.item.id, {
            label: formLabel,
            daysOfWeek,
            active: formActive,
            sortOrder: formMode.item.sortOrder,
          });

    if (!result.ok) {
      setFormError(result.error ?? "Não foi possível salvar.");
      return;
    }

    setFormMode(null);
    setFormError("");
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) {
      return;
    }

    const result = removeItem(deleteTarget.id);
    if (!result.ok) {
      setDeleteError(result.error ?? "Não foi possível excluir.");
      return;
    }

    setDeleteTarget(null);
    setDeleteError("");
  }

  function handleTemplateSave() {
    if (!activeTemplate || !activeTemplateDraft) {
      return;
    }

    const result = editTemplate(activeTemplate.id, {
      timeWindowStart: activeTemplateDraft.start,
      timeWindowEnd: activeTemplateDraft.end,
      active: activeTemplate.active,
    });

    if (!result.ok) {
      setTemplateError(result.error ?? "Não foi possível salvar.");
      return;
    }

    setTemplateDrafts((current) => {
      const next = { ...current };
      delete next[activeTemplate.id];
      return next;
    });
    setTemplateError("");
  }

  function updateTemplateDraft(field: "start" | "end", value: string) {
    if (!activeTemplate) {
      return;
    }

    setTemplateDrafts((current) => {
      const existing = current[activeTemplate.id] ?? {
        start: activeTemplate.timeWindowStart,
        end: activeTemplate.timeWindowEnd,
      };

      return {
        ...current,
        [activeTemplate.id]: {
          ...existing,
          [field]: value,
        },
      };
    });
    setTemplateError("");
  }

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b border-border bg-card px-6 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-heading text-xl font-bold text-foreground">
              Checklists operacionais
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Gerencie itens de abertura e fecho e consulte o histórico de conclusão.
            </p>
          </div>

          {activeTab === "items" ? (
            <Button type="button" className="rounded-xl" onClick={openCreateForm}>
              <Plus className="size-4" />
              Novo item
            </Button>
          ) : null}
        </div>

        <div className="mt-4">
          <ToggleGroup
            value={[activeTab]}
            onValueChange={(value) => {
              const next = value[0];
              if (next === "items" || next === "history") {
                setActiveTab(next);
              }
            }}
            variant="outline"
            className="rounded-xl"
          >
            <ToggleGroupItem value="items" className="rounded-lg px-4">
              Itens
            </ToggleGroupItem>
            <ToggleGroupItem value="history" className="rounded-lg px-4">
              Histórico
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </header>

      {activeTab === "items" ? (
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          <ToggleGroup
            value={[activeType]}
            onValueChange={(value) => {
              const next = value[0];
              if (next === "opening" || next === "closing") {
                setActiveType(next);
              }
            }}
            variant="outline"
            className="rounded-xl"
          >
            {(["opening", "closing"] as const).map((type) => (
              <ToggleGroupItem key={type} value={type} className="rounded-lg px-4">
                {CHECKLIST_TYPE_LABELS[type]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          {activeTemplate ? (
            <section className="rounded-3xl border border-border bg-card p-5 shadow-elevated">
              <h3 className="font-heading text-base font-semibold text-foreground">
                Horário sugerido — {CHECKLIST_TYPE_LABELS[activeType]}
              </h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <div className="space-y-2">
                  <label htmlFor="template-start" className="text-sm font-medium">
                    Início
                  </label>
                  <Input
                    id="template-start"
                    value={activeTemplateDraft?.start ?? ""}
                    onChange={(event) => updateTemplateDraft("start", event.target.value)}
                    className="h-11 rounded-xl"
                    placeholder="06:30"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="template-end" className="text-sm font-medium">
                    Fim
                  </label>
                  <Input
                    id="template-end"
                    value={activeTemplateDraft?.end ?? ""}
                    onChange={(event) => updateTemplateDraft("end", event.target.value)}
                    className="h-11 rounded-xl"
                    placeholder="07:00"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    className="rounded-xl"
                    onClick={handleTemplateSave}
                  >
                    Salvar horário
                  </Button>
                </div>
              </div>
              {templateError ? (
                <p className="mt-2 text-sm text-destructive">{templateError}</p>
              ) : null}
            </section>
          ) : null}

          {activeItems.length === 0 ? (
            <div className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-border px-6 py-10">
              <p className="text-center text-muted-foreground">
                Nenhum item cadastrado para esta checklist.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-elevated">
              <ul className="divide-y divide-border">
                {activeItems.map((item, index) => (
                  <li key={item.id} className="flex items-start gap-3 px-5 py-4">
                    <div className="flex flex-col gap-1 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        className="rounded-lg"
                        disabled={index === 0}
                        aria-label="Mover para cima"
                        onClick={() => reorderItem(item.id, "up")}
                      >
                        <ArrowUp className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        className="rounded-lg"
                        disabled={index === activeItems.length - 1}
                        aria-label="Mover para baixo"
                        onClick={() => reorderItem(item.id, "down")}
                      >
                        <ArrowDown className="size-3.5" />
                      </Button>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "font-medium text-foreground",
                          !item.active && "text-muted-foreground line-through",
                        )}
                      >
                        {item.label}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatDaysFilter(item.daysOfWeek)}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        className="rounded-lg"
                        aria-label={`Editar ${item.label}`}
                        onClick={() => openEditForm(item)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        className="rounded-lg text-destructive hover:text-destructive"
                        aria-label={`Excluir ${item.label}`}
                        onClick={() => {
                          setDeleteError("");
                          setDeleteTarget(item);
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {selectedHistoryDateKey ? (
            <div className="space-y-4">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => setSelectedHistoryDateKey(null)}
              >
                Voltar ao histórico
              </Button>

              <HistoryDetailPanel dateKey={selectedHistoryDateKey} view={historyView} />
            </div>
          ) : historyDays.length === 0 ? (
            <div className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-border px-6 py-10">
              <p className="text-center text-muted-foreground">
                Nenhum histórico disponível ainda.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
              <ul className="divide-y divide-border">
                {historyDays.map((day) => (
                  <li key={day.dateKey}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/50"
                      onClick={() => setSelectedHistoryDateKey(day.dateKey)}
                    >
                      <div className="min-w-0">
                        <p className="font-heading text-base font-semibold capitalize text-foreground">
                          {formatReportDate(day.date)}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Abertura {day.opening.completed}/{day.opening.total} · Fecho{" "}
                          {day.closing.completed}/{day.closing.total}
                        </p>
                      </div>
                      <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <Dialog open={formMode !== null} onOpenChange={(open) => !open && setFormMode(null)}>
        <DialogContent className="max-w-md rounded-3xl p-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {formMode?.type === "create" ? "Novo item" : "Editar item"}
            </DialogTitle>
            <DialogDescription>
              Defina a descrição e em quais dias o item aparece na checklist.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="item-label" className="text-sm font-medium">
                Descrição
              </label>
              <Input
                id="item-label"
                value={formLabel}
                onChange={(event) => {
                  setFormLabel(event.target.value);
                  setFormError("");
                }}
                className="h-11 rounded-xl px-3"
                placeholder="Descreva a tarefa"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Dias da semana</p>
              <div className="flex flex-wrap gap-2">
                {ALL_DAYS.map((day) => {
                  const selected = formDays.includes(day);

                  return (
                    <Button
                      key={day}
                      type="button"
                      size="sm"
                      variant={selected ? "default" : "outline"}
                      className="rounded-xl"
                      onClick={() => {
                        setFormDays((current) =>
                          selected
                            ? current.filter((value) => value !== day)
                            : [...current, day].sort((left, right) => left - right),
                        );
                      }}
                    >
                      {DAY_OF_WEEK_SHORT_LABELS[day]}
                    </Button>
                  );
                })}
              </div>
            </div>

            {formMode?.type === "edit" ? (
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={formActive}
                  onChange={(event) => setFormActive(event.target.checked)}
                />
                Item ativo
              </label>
            ) : null}

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
            <DialogTitle className="text-xl">Excluir item</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `Deseja excluir "${deleteTarget.label}"? Esta ação não pode ser desfeita.`
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

interface HistoryDetailPanelProps {
  dateKey: string;
  view: ReturnType<typeof useDailyChecklist>;
}

function HistoryDetailPanel({ dateKey, view }: HistoryDetailPanelProps) {
  const parsedDate = parseLocalDateKey(dateKey);

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border bg-card p-5 shadow-elevated">
        <h3 className="font-heading text-lg font-semibold capitalize text-foreground">
          {parsedDate ? formatReportDate(parsedDate) : dateKey}
        </h3>
      </div>

      {(["opening", "closing"] as const).map((type) => {
        const typeView = view.getView(type);

        return (
          <section
            key={type}
            className="space-y-4 rounded-3xl border border-border bg-card p-5 shadow-elevated"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h4 className="font-heading text-base font-semibold text-foreground">
                  {CHECKLIST_TYPE_LABELS[type]}
                </h4>
                {typeView.template ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Horário: {typeView.timeWindowLabel}
                  </p>
                ) : null}
              </div>
              {typeView.template ? (
                <ChecklistTimeWindowBadge
                  label={typeView.timeWindowLabel}
                  status={typeView.timeWindowStatus}
                />
              ) : null}
            </div>

            <ChecklistProgressBar progress={typeView.progress} />

            <ChecklistItemsGroup
              title="Itens do dia"
              items={typeView.grouped.general}
              onToggle={() => undefined}
              readOnly
            />
            <ChecklistItemsGroup
              title="Específicos do dia"
              items={typeView.grouped.specific}
              onToggle={() => undefined}
              readOnly
            />
          </section>
        );
      })}
    </div>
  );
}
