import type {
  ChecklistCompletion,
  ChecklistHistoryDay,
  ChecklistItem,
  ChecklistProgress,
  ChecklistTemplate,
  ChecklistType,
  DayOfWeek,
  ResolvedChecklistItem,
} from "../types";
import {
  getDateKeyFromDate,
  parseLocalDateKey,
} from "@/features/sales/utils/formatReportDate";

import { isDaySpecificItem, itemAppliesOnDay } from "./checklistTimeWindow";

export function getDayOfWeekFromDate(date: Date): DayOfWeek {
  return date.getDay() as DayOfWeek;
}

export function getDayOfWeekFromDateKey(dateKey: string): DayOfWeek | null {
  const date = parseLocalDateKey(dateKey);
  if (!date) {
    return null;
  }

  return getDayOfWeekFromDate(date);
}

export function filterItemsForDay(
  items: ChecklistItem[],
  templateId: string,
  dayOfWeek: DayOfWeek,
): ChecklistItem[] {
  return items
    .filter(
      (item) =>
        item.templateId === templateId &&
        item.active &&
        itemAppliesOnDay(item.daysOfWeek, dayOfWeek),
    )
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

export function resolveDailyItems(
  items: ChecklistItem[],
  completions: ChecklistCompletion[],
  templateId: string,
  dateKey: string,
  dayOfWeek: DayOfWeek,
): ResolvedChecklistItem[] {
  const dayItems = filterItemsForDay(items, templateId, dayOfWeek);
  const completionMap = new Map(
    completions
      .filter((completion) => completion.dateKey === dateKey)
      .map((completion) => [completion.itemId, completion]),
  );

  return dayItems.map((item) => {
    const completion = completionMap.get(item.id);

    return {
      item,
      completed: Boolean(completion),
      completedAt: completion?.completedAt,
      isDaySpecific: isDaySpecificItem(item.daysOfWeek),
    };
  });
}

export function computeProgress(items: ResolvedChecklistItem[]): ChecklistProgress {
  const total = items.length;
  const completed = items.filter((entry) => entry.completed).length;

  return {
    completed,
    total,
    isComplete: total > 0 && completed === total,
  };
}

export function groupResolvedItems(
  items: ResolvedChecklistItem[],
): { general: ResolvedChecklistItem[]; specific: ResolvedChecklistItem[] } {
  return {
    general: items.filter((entry) => !entry.isDaySpecific),
    specific: items.filter((entry) => entry.isDaySpecific),
  };
}

export function getTemplateByType(
  templates: ChecklistTemplate[],
  type: ChecklistType,
): ChecklistTemplate | undefined {
  return templates.find((template) => template.type === type && template.active);
}

export function buildHistoryDays(
  completions: ChecklistCompletion[],
  items: ChecklistItem[],
  templates: ChecklistTemplate[],
): ChecklistHistoryDay[] {
  const dateKeys = new Set(completions.map((completion) => completion.dateKey));
  const todayKey = getDateKeyFromDate(new Date());
  dateKeys.add(todayKey);

  const openingTemplate = getTemplateByType(templates, "opening");
  const closingTemplate = getTemplateByType(templates, "closing");

  return [...dateKeys]
    .map((dateKey) => {
      const date = parseLocalDateKey(dateKey);
      if (!date) {
        return null;
      }

      const dayOfWeek = getDayOfWeekFromDate(date);

      const openingItems = openingTemplate
        ? resolveDailyItems(items, completions, openingTemplate.id, dateKey, dayOfWeek)
        : [];
      const closingItems = closingTemplate
        ? resolveDailyItems(items, completions, closingTemplate.id, dateKey, dayOfWeek)
        : [];

      return {
        dateKey,
        date,
        opening: computeProgress(openingItems),
        closing: computeProgress(closingItems),
      };
    })
    .filter((entry): entry is ChecklistHistoryDay => entry !== null)
    .sort((left, right) => right.dateKey.localeCompare(left.dateKey));
}

export function validateItemLabel(label: string): string | null {
  const trimmed = label.trim();
  if (!trimmed) {
    return "Informe a descrição do item.";
  }

  if (trimmed.length > 200) {
    return "A descrição deve ter no máximo 200 caracteres.";
  }

  return null;
}

export function validateTimeValue(value: string): string | null {
  if (!/^(\d{1,2}):(\d{2})$/.test(value.trim())) {
    return "Use o formato HH:MM.";
  }

  return null;
}
