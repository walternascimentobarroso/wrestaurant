import { buildSeedChecklists } from "../data/seedChecklists";
import type {
  ChecklistActionResult,
  ChecklistCompletion,
  ChecklistDaysFilter,
  ChecklistItem,
  ChecklistStore,
  ChecklistTemplate,
  DayOfWeek,
} from "../types";
import { validateItemLabel, validateTimeValue } from "../utils/resolveDailyItems";

const STORAGE_KEY = "restaurant-checklists";
const STORAGE_EVENT = "restaurant-checklists-change";

const SERVER_SNAPSHOT = buildSeedChecklists();

let cachedClientRaw: string | null | undefined;
let cachedClientSnapshot: ChecklistStore | null = null;

interface LegacyChecklistStore {
  templates?: Partial<ChecklistTemplate>[];
  items?: Partial<ChecklistItem>[];
  completions?: Partial<ChecklistCompletion>[];
}

function normalizeDaysFilter(value: ChecklistDaysFilter | undefined): ChecklistDaysFilter {
  if (!value || value === "all") {
    return "all";
  }

  return value as DayOfWeek[];
}

function normalizeTemplate(raw: Partial<ChecklistTemplate>): ChecklistTemplate {
  return {
    id: raw.id ?? "",
    type: raw.type ?? "opening",
    title: raw.title ?? "",
    timeWindowStart: raw.timeWindowStart ?? "00:00",
    timeWindowEnd: raw.timeWindowEnd ?? "00:00",
    sortOrder: raw.sortOrder ?? 0,
    active: raw.active ?? true,
  };
}

function normalizeItem(raw: Partial<ChecklistItem>): ChecklistItem {
  return {
    id: raw.id ?? "",
    templateId: raw.templateId ?? "",
    label: raw.label ?? "",
    sortOrder: raw.sortOrder ?? 0,
    daysOfWeek: normalizeDaysFilter(raw.daysOfWeek),
    active: raw.active ?? true,
  };
}

function normalizeCompletion(raw: Partial<ChecklistCompletion>): ChecklistCompletion {
  return {
    id: raw.id ?? "",
    dateKey: raw.dateKey ?? "",
    itemId: raw.itemId ?? "",
    completedAt: raw.completedAt ?? new Date().toISOString(),
  };
}

function parseStoredChecklists(raw: string): ChecklistStore {
  try {
    const parsed = JSON.parse(raw) as LegacyChecklistStore;
    if (!parsed || typeof parsed !== "object") {
      return SERVER_SNAPSHOT;
    }

    return {
      templates: Array.isArray(parsed.templates)
        ? parsed.templates.map(normalizeTemplate)
        : SERVER_SNAPSHOT.templates,
      items: Array.isArray(parsed.items)
        ? parsed.items.map(normalizeItem)
        : SERVER_SNAPSHOT.items,
      completions: Array.isArray(parsed.completions)
        ? parsed.completions.map(normalizeCompletion)
        : [],
    };
  } catch {
    return SERVER_SNAPSHOT;
  }
}

function readChecklistsFromStorage(): ChecklistStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === cachedClientRaw && cachedClientSnapshot !== null) {
      return cachedClientSnapshot;
    }

    cachedClientRaw = raw;
    cachedClientSnapshot = raw ? parseStoredChecklists(raw) : SERVER_SNAPSHOT;
    return cachedClientSnapshot;
  } catch {
    cachedClientRaw = null;
    cachedClientSnapshot = SERVER_SNAPSHOT;
    return SERVER_SNAPSHOT;
  }
}

function persistStore(store: ChecklistStore): void {
  const serialized = JSON.stringify(store);
  localStorage.setItem(STORAGE_KEY, serialized);
  cachedClientRaw = serialized;
  cachedClientSnapshot = store;
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function subscribeChecklists(onStoreChange: () => void): () => void {
  const handler = (event: Event) => {
    if (event.type === "storage") {
      cachedClientRaw = undefined;
      cachedClientSnapshot = null;
    }
    onStoreChange();
  };

  window.addEventListener(STORAGE_EVENT, handler);
  window.addEventListener("storage", handler);

  return () => {
    window.removeEventListener(STORAGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function getChecklistsSnapshot(): ChecklistStore {
  return readChecklistsFromStorage();
}

export function getChecklistsServerSnapshot(): ChecklistStore {
  return SERVER_SNAPSHOT;
}

function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function toggleItemCompletion(
  itemId: string,
  dateKey: string,
): ChecklistActionResult {
  const store = readChecklistsFromStorage();
  const existing = store.completions.find(
    (completion) => completion.dateKey === dateKey && completion.itemId === itemId,
  );

  if (existing) {
    persistStore({
      ...store,
      completions: store.completions.filter((completion) => completion.id !== existing.id),
    });
    return { ok: true };
  }

  const completion: ChecklistCompletion = {
    id: createId("completion"),
    dateKey,
    itemId,
    completedAt: new Date().toISOString(),
  };

  persistStore({
    ...store,
    completions: [...store.completions, completion],
  });

  return { ok: true };
}

export function createChecklistItem(input: {
  templateId: string;
  label: string;
  daysOfWeek: ChecklistDaysFilter;
  sortOrder?: number;
}): ChecklistActionResult {
  const labelError = validateItemLabel(input.label);
  if (labelError) {
    return { ok: false, error: labelError };
  }

  const store = readChecklistsFromStorage();
  const template = store.templates.find((entry) => entry.id === input.templateId);
  if (!template) {
    return { ok: false, error: "Checklist não encontrada." };
  }

  const templateItems = store.items.filter((item) => item.templateId === input.templateId);
  const maxSortOrder = templateItems.reduce(
    (max, item) => Math.max(max, item.sortOrder),
    -1,
  );

  const item: ChecklistItem = {
    id: createId("item"),
    templateId: input.templateId,
    label: input.label.trim(),
    sortOrder: input.sortOrder ?? maxSortOrder + 1,
    daysOfWeek: input.daysOfWeek,
    active: true,
  };

  persistStore({
    ...store,
    items: [...store.items, item],
  });

  return { ok: true };
}

export function updateChecklistItem(
  id: string,
  input: {
    label: string;
    daysOfWeek: ChecklistDaysFilter;
    active: boolean;
    sortOrder: number;
  },
): ChecklistActionResult {
  const labelError = validateItemLabel(input.label);
  if (labelError) {
    return { ok: false, error: labelError };
  }

  const store = readChecklistsFromStorage();
  const current = store.items.find((item) => item.id === id);
  if (!current) {
    return { ok: false, error: "Item não encontrado." };
  }

  persistStore({
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
  });

  return { ok: true };
}

export function deleteChecklistItem(id: string): ChecklistActionResult {
  const store = readChecklistsFromStorage();
  const exists = store.items.some((item) => item.id === id);
  if (!exists) {
    return { ok: false, error: "Item não encontrado." };
  }

  persistStore({
    ...store,
    items: store.items.filter((item) => item.id !== id),
    completions: store.completions.filter((completion) => completion.itemId !== id),
  });

  return { ok: true };
}

export function updateChecklistTemplate(
  id: string,
  input: {
    timeWindowStart: string;
    timeWindowEnd: string;
    active: boolean;
  },
): ChecklistActionResult {
  const startError = validateTimeValue(input.timeWindowStart);
  if (startError) {
    return { ok: false, error: `Horário de início: ${startError}` };
  }

  const endError = validateTimeValue(input.timeWindowEnd);
  if (endError) {
    return { ok: false, error: `Horário de fim: ${endError}` };
  }

  const store = readChecklistsFromStorage();
  const current = store.templates.find((template) => template.id === id);
  if (!current) {
    return { ok: false, error: "Checklist não encontrada." };
  }

  persistStore({
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
  });

  return { ok: true };
}

export function moveChecklistItem(id: string, direction: "up" | "down"): ChecklistActionResult {
  const store = readChecklistsFromStorage();
  const current = store.items.find((item) => item.id === id);
  if (!current) {
    return { ok: false, error: "Item não encontrado." };
  }

  const siblings = store.items
    .filter((item) => item.templateId === current.templateId)
    .sort((left, right) => left.sortOrder - right.sortOrder);

  const currentIndex = siblings.findIndex((item) => item.id === id);
  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  const target = siblings[targetIndex];

  if (!target) {
    return { ok: false, error: "Não é possível mover o item nesta direção." };
  }

  const nextItems = store.items.map((item) => {
    if (item.id === current.id) {
      return { ...item, sortOrder: target.sortOrder };
    }

    if (item.id === target.id) {
      return { ...item, sortOrder: current.sortOrder };
    }

    return item;
  });

  persistStore({
    ...store,
    items: nextItems,
  });

  return { ok: true };
}
