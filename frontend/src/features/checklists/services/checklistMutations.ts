import { generateMutationId } from "@/lib/offline";

import type {
  ChecklistCompletion,
  ChecklistDaysFilter,
  ChecklistItem,
  ChecklistStore,
  ChecklistTemplate,
} from "../types";

export function applyToggleCompletion(
  store: ChecklistStore,
  itemId: string,
  dateKey: string,
): ChecklistStore {
  const existing = store.completions.find(
    (completion) => completion.itemId === itemId && completion.dateKey === dateKey,
  );

  if (existing) {
    return {
      ...store,
      completions: store.completions.filter((completion) => completion.id !== existing.id),
    };
  }

  const completion: ChecklistCompletion = {
    id: `completion-${generateMutationId()}`,
    dateKey,
    itemId,
    completedAt: new Date().toISOString(),
  };

  return {
    ...store,
    completions: [...store.completions, completion],
  };
}

export function applyCreateChecklistItem(
  store: ChecklistStore,
  input: {
    templateId: string;
    label: string;
    daysOfWeek: ChecklistDaysFilter;
    sortOrder?: number;
  },
  tempId: string,
): ChecklistStore {
  const siblings = store.items.filter((item) => item.templateId === input.templateId);
  const maxSort = siblings.reduce((max, item) => Math.max(max, item.sortOrder), -1);

  const item: ChecklistItem = {
    id: tempId,
    templateId: input.templateId,
    label: input.label.trim(),
    sortOrder: input.sortOrder ?? maxSort + 1,
    daysOfWeek: input.daysOfWeek,
    active: true,
  };

  return {
    ...store,
    items: [...store.items, item],
  };
}

export function applyUpdateChecklistItem(
  store: ChecklistStore,
  id: string,
  input: {
    label: string;
    daysOfWeek: ChecklistDaysFilter;
    active: boolean;
    sortOrder: number;
  },
): ChecklistStore {
  return {
    ...store,
    items: store.items.map((item) =>
      item.id === id
        ? {
            ...item,
            label: input.label.trim(),
            daysOfWeek: input.daysOfWeek,
            active: input.active,
            sortOrder: input.sortOrder,
          }
        : item,
    ),
  };
}

export function applyDeleteChecklistItem(
  store: ChecklistStore,
  id: string,
): ChecklistStore {
  return {
    ...store,
    items: store.items.filter((item) => item.id !== id),
    completions: store.completions.filter((completion) => completion.itemId !== id),
  };
}

export function applyUpdateChecklistTemplate(
  store: ChecklistStore,
  id: string,
  input: {
    timeWindowStart: string;
    timeWindowEnd: string;
    active: boolean;
  },
): ChecklistStore {
  return {
    ...store,
    templates: store.templates.map((template) =>
      template.id === id
        ? {
            ...template,
            timeWindowStart: input.timeWindowStart.trim(),
            timeWindowEnd: input.timeWindowEnd.trim(),
            active: input.active,
          }
        : template,
    ),
  };
}

export function applyMoveChecklistItem(
  store: ChecklistStore,
  id: string,
  direction: "up" | "down",
): ChecklistStore {
  const item = store.items.find((entry) => entry.id === id);
  if (!item) {
    throw new Error("Item não encontrado.");
  }

  const siblings = store.items
    .filter((entry) => entry.templateId === item.templateId)
    .sort((left, right) => left.sortOrder - right.sortOrder);

  const index = siblings.findIndex((entry) => entry.id === id);
  const targetIndex = direction === "up" ? index - 1 : index + 1;

  if (index < 0 || targetIndex < 0 || targetIndex >= siblings.length) {
    throw new Error("Não é possível mover o item nesta direção.");
  }

  const target = siblings[targetIndex];
  const updatedItems = store.items.map((entry) => {
    if (entry.id === item.id) {
      return { ...entry, sortOrder: target.sortOrder };
    }
    if (entry.id === target.id) {
      return { ...entry, sortOrder: item.sortOrder };
    }
    return entry;
  });

  return {
    ...store,
    items: updatedItems,
  };
}

export function replaceChecklistItemId(
  store: ChecklistStore,
  oldId: string,
  newId: string,
): ChecklistStore {
  return {
    ...store,
    items: store.items.map((item) =>
      item.id === oldId ? { ...item, id: newId } : item,
    ),
    completions: store.completions.map((completion) =>
      completion.itemId === oldId ? { ...completion, itemId: newId } : completion,
    ),
  };
}

export function mergeDailyCompletions(
  store: ChecklistStore,
  dateKey: string,
  completions: ChecklistCompletion[],
): ChecklistStore {
  const withoutDate = store.completions.filter(
    (completion) => completion.dateKey !== dateKey,
  );

  return {
    ...store,
    completions: [...withoutDate, ...completions],
  };
}

export function replaceChecklistsFromServer(
  templates: ChecklistTemplate[],
  items: ChecklistItem[],
  completions: ChecklistCompletion[] = [],
): ChecklistStore {
  return {
    templates,
    items,
    completions,
  };
}
