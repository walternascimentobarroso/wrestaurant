export type ChecklistType = "opening" | "closing";

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type ChecklistDaysFilter = "all" | DayOfWeek[];

export interface ChecklistTemplate {
  id: string;
  type: ChecklistType;
  title: string;
  timeWindowStart: string;
  timeWindowEnd: string;
  sortOrder: number;
  active: boolean;
}

export interface ChecklistItem {
  id: string;
  templateId: string;
  label: string;
  sortOrder: number;
  daysOfWeek: ChecklistDaysFilter;
  active: boolean;
}

export interface ChecklistCompletion {
  id: string;
  dateKey: string;
  itemId: string;
  completedAt: string;
}

export interface ChecklistStore {
  templates: ChecklistTemplate[];
  items: ChecklistItem[];
  completions: ChecklistCompletion[];
}

export interface ChecklistActionResult {
  ok: boolean;
  error?: string;
}

export interface ResolvedChecklistItem {
  item: ChecklistItem;
  completed: boolean;
  completedAt?: string;
  isDaySpecific: boolean;
}

export interface ChecklistProgress {
  completed: number;
  total: number;
  isComplete: boolean;
}

export interface ChecklistHistoryDay {
  dateKey: string;
  date: Date;
  opening: ChecklistProgress;
  closing: ChecklistProgress;
}

export const CHECKLIST_TYPE_LABELS: Record<ChecklistType, string> = {
  opening: "Abertura",
  closing: "Fecho",
};

export const DAY_OF_WEEK_LABELS: Record<DayOfWeek, string> = {
  0: "Domingo",
  1: "Segunda",
  2: "Terça",
  3: "Quarta",
  4: "Quinta",
  5: "Sexta",
  6: "Sábado",
};

export const DAY_OF_WEEK_SHORT_LABELS: Record<DayOfWeek, string> = {
  0: "Dom",
  1: "Seg",
  2: "Ter",
  3: "Qua",
  4: "Qui",
  5: "Sex",
  6: "Sáb",
};
