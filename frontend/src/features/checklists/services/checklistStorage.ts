import type {
  ChecklistActionResult,
  ChecklistCompletion,
  ChecklistDaysFilter,
  ChecklistItem,
  ChecklistStore,
  ChecklistTemplate,
} from "../types";
import { apiFetch } from "@/lib/api";
import {
  createOfflineStore,
  generateTempId,
  isOnline,
  isTempId,
  syncEngine,
  syncQueue,
} from "@/lib/offline";

import {
  applyCreateChecklistItem,
  applyDeleteChecklistItem,
  applyMoveChecklistItem,
  applyToggleCompletion,
  applyUpdateChecklistItem,
  applyUpdateChecklistTemplate,
  mergeDailyCompletions,
  replaceChecklistItemId,
  replaceChecklistsFromServer,
} from "./checklistMutations";

const STORAGE_KEY = "checklists";

const EMPTY_STORE: ChecklistStore = {
  templates: [],
  items: [],
  completions: [],
};

const store = createOfflineStore<ChecklistStore>({
  key: STORAGE_KEY,
  serverSnapshot: EMPTY_STORE,
  eventName: "restaurant-checklists-change",
});

const tempIdMap = new Map<string, string>();

function enqueueAndFlush(
  mutation: Omit<
    Parameters<typeof syncQueue.enqueue>[0],
    "id" | "createdAt" | "retries"
  >,
): void {
  syncQueue.enqueue(mutation);
  void syncEngine.flush();
}

export function resolveChecklistItemId(itemId: string): string {
  if (!isTempId(itemId)) {
    return itemId;
  }
  return tempIdMap.get(itemId) ?? itemId;
}

export function replaceTempChecklistItemId(oldId: string, newId: string): void {
  tempIdMap.set(oldId, newId);
  store.mutate((current) => replaceChecklistItemId(current, oldId, newId));
  syncQueue.remapEntityId("checklists", oldId, newId);
}

export function replaceChecklistStoreFromServer(next: ChecklistStore): void {
  store.replace(next);
}

export async function hydrateChecklistsIfEmpty(): Promise<void> {
  if (!isOnline()) {
    return;
  }

  const snapshot = store.getSnapshot();
  if (snapshot.templates.length > 0 || snapshot.items.length > 0) {
    return;
  }

  try {
    const [templates, items] = await Promise.all([
      apiFetch<ChecklistTemplate[]>("/checklists/templates"),
      apiFetch<ChecklistItem[]>("/checklists/items"),
    ]);
    store.replace(replaceChecklistsFromServer(templates, items, snapshot.completions));
  } catch {
    // Keep local cache until next successful hydrate.
  }
}

async function hydrateDailyCompletions(dateKey: string): Promise<void> {
  if (!isOnline()) {
    return;
  }

  try {
    const daily = await apiFetch<{
      dateKey: string;
      opening: Array<{
        item: ChecklistItem;
        completed: boolean;
        completedAt?: string;
      }>;
      closing: Array<{
        item: ChecklistItem;
        completed: boolean;
        completedAt?: string;
      }>;
    }>(`/checklists/daily?date=${dateKey}`);

    const completions: ChecklistCompletion[] = [];

    for (const entry of [...daily.opening, ...daily.closing]) {
      if (!entry.completed || !entry.completedAt) {
        continue;
      }

      completions.push({
        id: `completion-${entry.item.id}-${dateKey}`,
        dateKey,
        itemId: entry.item.id,
        completedAt: entry.completedAt,
      });
    }

    store.mutate((current) => mergeDailyCompletions(current, dateKey, completions));
  } catch {
    // Daily hydrate is best-effort.
  }
}

export const subscribeChecklists = store.subscribe;
export const getChecklistsSnapshot = store.getSnapshot;
export const getChecklistsServerSnapshot = store.getServerSnapshot;
export const isChecklistsLoaded = store.isLoaded;

export function toggleItemCompletion(
  itemId: string,
  dateKey: string,
): ChecklistActionResult {
  try {
    store.mutate((current) => applyToggleCompletion(current, itemId, dateKey));
    enqueueAndFlush({
      entity: "checklists",
      operation: "toggleCompletion",
      entityId: itemId,
      payload: { itemId, dateKey },
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erro ao atualizar.",
    };
  }
}

export function createChecklistItem(input: {
  templateId: string;
  label: string;
  daysOfWeek: ChecklistDaysFilter;
  sortOrder?: number;
}): ChecklistActionResult {
  try {
    const tempId = generateTempId();
    store.mutate((current) => applyCreateChecklistItem(current, input, tempId));
    enqueueAndFlush({
      entity: "checklists",
      operation: "create",
      entityId: tempId,
      payload: input,
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erro ao criar item.",
    };
  }
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
  try {
    store.mutate((current) => applyUpdateChecklistItem(current, id, input));

    if (isTempId(id)) {
      const pendingCreate = syncQueue.findPendingMutation("checklists", id, "create");
      if (pendingCreate) {
        syncQueue.updateMutationPayload(pendingCreate.id, {
          ...(pendingCreate.payload as Record<string, unknown>),
          ...input,
        });
      } else {
        enqueueAndFlush({
          entity: "checklists",
          operation: "update",
          entityId: id,
          payload: input,
        });
      }
    } else {
      enqueueAndFlush({
        entity: "checklists",
        operation: "update",
        entityId: id,
        payload: input,
      });
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erro ao atualizar item.",
    };
  }
}

export function deleteChecklistItem(id: string): ChecklistActionResult {
  try {
    store.mutate((current) => applyDeleteChecklistItem(current, id));

    if (isTempId(id)) {
      syncQueue.removeMutationsForEntityId("checklists", id);
      return { ok: true };
    }

    enqueueAndFlush({
      entity: "checklists",
      operation: "delete",
      entityId: id,
      payload: {},
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erro ao excluir item.",
    };
  }
}

export function updateChecklistTemplate(
  id: string,
  input: {
    timeWindowStart: string;
    timeWindowEnd: string;
    active: boolean;
  },
): ChecklistActionResult {
  try {
    store.mutate((current) => applyUpdateChecklistTemplate(current, id, input));
    enqueueAndFlush({
      entity: "checklists",
      operation: "updateTemplate",
      entityId: id,
      payload: input,
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erro ao atualizar checklist.",
    };
  }
}

export function moveChecklistItem(
  id: string,
  direction: "up" | "down",
): ChecklistActionResult {
  try {
    store.mutate((current) => applyMoveChecklistItem(current, id, direction));

    if (isTempId(id)) {
      const pendingCreate = syncQueue.findPendingMutation("checklists", id, "create");
      if (pendingCreate) {
        return { ok: true };
      }
    }

    enqueueAndFlush({
      entity: "checklists",
      operation: "moveItem",
      entityId: id,
      payload: { direction },
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erro ao mover item.",
    };
  }
}

export async function fetchDailyChecklist(dateKey: string) {
  await hydrateDailyCompletions(dateKey);
  return getChecklistsSnapshot();
}
