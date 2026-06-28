"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

import {
  createChecklistItem,
  deleteChecklistItem,
  getChecklistsServerSnapshot,
  getChecklistsSnapshot,
  moveChecklistItem,
  subscribeChecklists,
  updateChecklistItem,
  updateChecklistTemplate,
} from "../services/checklistStorage";
import type {
  ChecklistActionResult,
  ChecklistDaysFilter,
  ChecklistHistoryDay,
  ChecklistItem,
  ChecklistTemplate,
  ChecklistType,
} from "../types";
import { buildHistoryDays } from "../utils/resolveDailyItems";

export function useChecklistAdmin() {
  const store = useSyncExternalStore(
    subscribeChecklists,
    getChecklistsSnapshot,
    getChecklistsServerSnapshot,
  );

  const historyDays: ChecklistHistoryDay[] = useMemo(
    () => buildHistoryDays(store.completions, store.items, store.templates),
    [store.completions, store.items, store.templates],
  );

  const getItemsByTemplate = useCallback(
    (templateId: string): ChecklistItem[] =>
      store.items
        .filter((item) => item.templateId === templateId)
        .sort((left, right) => left.sortOrder - right.sortOrder),
    [store.items],
  );

  const addItem = useCallback(
    (input: {
      templateId: string;
      label: string;
      daysOfWeek: ChecklistDaysFilter;
    }): ChecklistActionResult =>
      createChecklistItem(input),
    [],
  );

  const editItem = useCallback(
    (
      id: string,
      input: {
        label: string;
        daysOfWeek: ChecklistDaysFilter;
        active: boolean;
        sortOrder: number;
      },
    ): ChecklistActionResult => updateChecklistItem(id, input),
    [],
  );

  const removeItem = useCallback(
    (id: string): ChecklistActionResult => deleteChecklistItem(id),
    [],
  );

  const reorderItem = useCallback(
    (id: string, direction: "up" | "down"): ChecklistActionResult =>
      moveChecklistItem(id, direction),
    [],
  );

  const editTemplate = useCallback(
    (
      id: string,
      input: {
        timeWindowStart: string;
        timeWindowEnd: string;
        active: boolean;
      },
    ): ChecklistActionResult => updateChecklistTemplate(id, input),
    [],
  );

  const getTemplateByType = useCallback(
    (type: ChecklistType): ChecklistTemplate | undefined =>
      store.templates.find((template) => template.type === type),
    [store.templates],
  );

  return {
    templates: store.templates,
    items: store.items,
    completions: store.completions,
    historyDays,
    getItemsByTemplate,
    getTemplateByType,
    addItem,
    editItem,
    removeItem,
    reorderItem,
    editTemplate,
  };
}