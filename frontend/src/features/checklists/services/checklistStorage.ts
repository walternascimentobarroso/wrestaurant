import type {
  ChecklistActionResult,
  ChecklistCompletion,
  ChecklistDaysFilter,
  ChecklistItem,
  ChecklistStore,
  ChecklistTemplate,
} from "../types";
import { apiFetch } from "@/lib/api";
import { createApiStore } from "@/lib/apiStore";

async function fetchChecklistStore(): Promise<ChecklistStore> {
  const [templates, items] = await Promise.all([
    apiFetch<ChecklistTemplate[]>("/checklists/templates").catch(() => [] as ChecklistTemplate[]),
    apiFetch<ChecklistItem[]>("/checklists/items").catch(() => [] as ChecklistItem[]),
  ]);

  return {
    templates,
    items,
    completions: [],
  };
}

const store = createApiStore<ChecklistStore>({
  fetchSnapshot: fetchChecklistStore,
  serverSnapshot: { templates: [], items: [], completions: [] },
  eventName: "restaurant-checklists-change",
});

export const subscribeChecklists = store.subscribe;
export const getChecklistsSnapshot = store.getSnapshot;
export const getChecklistsServerSnapshot = store.getServerSnapshot;

export async function toggleItemCompletion(
  itemId: string,
  dateKey: string,
): Promise<ChecklistActionResult> {
  try {
    await apiFetch("/checklists/completions/toggle", {
      method: "POST",
      body: JSON.stringify({ itemId, dateKey }),
    });
    await store.refresh();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erro ao atualizar." };
  }
}

export async function createChecklistItem(input: {
  templateId: string;
  label: string;
  daysOfWeek: ChecklistDaysFilter;
  sortOrder?: number;
}): Promise<ChecklistActionResult> {
  try {
    await apiFetch("/checklists/items", {
      method: "POST",
      body: JSON.stringify(input),
    });
    await store.refresh();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erro ao criar item." };
  }
}

export async function updateChecklistItem(
  id: string,
  input: {
    label: string;
    daysOfWeek: ChecklistDaysFilter;
    active: boolean;
    sortOrder: number;
  },
): Promise<ChecklistActionResult> {
  try {
    await apiFetch(`/checklists/items/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
    await store.refresh();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erro ao atualizar item." };
  }
}

export async function deleteChecklistItem(id: string): Promise<ChecklistActionResult> {
  try {
    await apiFetch(`/checklists/items/${id}`, { method: "DELETE" });
    await store.refresh();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erro ao excluir item." };
  }
}

export async function updateChecklistTemplate(
  id: string,
  input: {
    timeWindowStart: string;
    timeWindowEnd: string;
    active: boolean;
  },
): Promise<ChecklistActionResult> {
  try {
    await apiFetch(`/checklists/templates/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
    await store.refresh();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erro ao atualizar checklist." };
  }
}

export async function moveChecklistItem(
  id: string,
  direction: "up" | "down",
): Promise<ChecklistActionResult> {
  try {
    await apiFetch(`/checklists/items/${id}/move`, {
      method: "POST",
      body: JSON.stringify({ direction }),
    });
    await store.refresh();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erro ao mover item." };
  }
}

export async function fetchDailyChecklist(dateKey: string) {
  return apiFetch(`/checklists/daily?date=${dateKey}`);
}
