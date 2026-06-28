"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import {
  getDateKeyFromDate,
  parseLocalDateKey,
} from "@/features/sales/utils/formatReportDate";

import {
  getChecklistsServerSnapshot,
  getChecklistsSnapshot,
  subscribeChecklists,
  toggleItemCompletion,
} from "../services/checklistStorage";
import type {
  ChecklistActionResult,
  ChecklistProgress,
  ChecklistTemplate,
  ChecklistType,
  ResolvedChecklistItem,
} from "../types";
import {
  formatTimeWindow,
  getTimeWindowStatus,
  type TimeWindowStatus,
} from "../utils/checklistTimeWindow";
import {
  computeProgress,
  getDayOfWeekFromDate,
  getDayOfWeekFromDateKey,
  getTemplateByType,
  groupResolvedItems,
  resolveDailyItems,
} from "../utils/resolveDailyItems";

interface DailyChecklistView {
  template: ChecklistTemplate | undefined;
  items: ResolvedChecklistItem[];
  grouped: ReturnType<typeof groupResolvedItems>;
  progress: ChecklistProgress;
  timeWindowLabel: string;
  timeWindowStatus: TimeWindowStatus;
}

function buildDailyView(
  type: ChecklistType,
  dateKey: string,
  now: Date,
  store: ReturnType<typeof getChecklistsSnapshot>,
): DailyChecklistView {
  const template = getTemplateByType(store.templates, type);
  const parsedDate = parseLocalDateKey(dateKey) ?? now;
  const dayOfWeek =
    getDayOfWeekFromDateKey(dateKey) ?? getDayOfWeekFromDate(parsedDate);

  const items = template
    ? resolveDailyItems(store.items, store.completions, template.id, dateKey, dayOfWeek)
    : [];

  const progress = computeProgress(items);

  return {
    template,
    items,
    grouped: groupResolvedItems(items),
    progress,
    timeWindowLabel: template
      ? formatTimeWindow(template.timeWindowStart, template.timeWindowEnd)
      : "",
    timeWindowStatus: template
      ? getTimeWindowStatus(
          template.timeWindowStart,
          template.timeWindowEnd,
          progress.isComplete,
          now,
        )
      : "within",
  };
}

export function useDailyChecklist(dateKey?: string) {
  const store = useSyncExternalStore(
    subscribeChecklists,
    getChecklistsSnapshot,
    getChecklistsServerSnapshot,
  );

  const [now, setNow] = useState(() => new Date());
  const resolvedDateKey = dateKey ?? getDateKeyFromDate(now);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  const opening = useMemo(
    () => buildDailyView("opening", resolvedDateKey, now, store),
    [resolvedDateKey, now, store],
  );

  const closing = useMemo(
    () => buildDailyView("closing", resolvedDateKey, now, store),
    [resolvedDateKey, now, store],
  );

  const toggleItem = useCallback(
    (itemId: string): ChecklistActionResult =>
      toggleItemCompletion(itemId, resolvedDateKey),
    [resolvedDateKey],
  );

  const getView = useCallback(
    (type: ChecklistType): DailyChecklistView =>
      type === "opening" ? opening : closing,
    [opening, closing],
  );

  const hasIncompleteOpening = !opening.progress.isComplete && opening.progress.total > 0;

  return {
    dateKey: resolvedDateKey,
    opening,
    closing,
    getView,
    toggleItem,
    hasIncompleteOpening,
  };
}

export function useChecklistProgressSummary() {
  const { opening, closing, hasIncompleteOpening } = useDailyChecklist();

  return {
    opening,
    closing,
    hasIncompleteOpening,
  };
}
