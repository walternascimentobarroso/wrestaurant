import type { DayOfWeek } from "../types";

export type TimeWindowStatus = "before" | "within" | "after" | "complete";

export function parseTimeToMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) {
    return null;
  }

  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

export function getCurrentMinutes(date: Date = new Date()): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function getTimeWindowStatus(
  timeWindowStart: string,
  timeWindowEnd: string,
  isComplete: boolean,
  now: Date = new Date(),
): TimeWindowStatus {
  if (isComplete) {
    return "complete";
  }

  const start = parseTimeToMinutes(timeWindowStart);
  const end = parseTimeToMinutes(timeWindowEnd);
  const current = getCurrentMinutes(now);

  if (start === null || end === null) {
    return "within";
  }

  if (current < start) {
    return "before";
  }

  if (current > end) {
    return "after";
  }

  return "within";
}

export function formatTimeWindow(start: string, end: string): string {
  return `${start} – ${end}`;
}

export function itemAppliesOnDay(
  daysOfWeek: "all" | DayOfWeek[],
  dayOfWeek: DayOfWeek,
): boolean {
  if (daysOfWeek === "all") {
    return true;
  }

  return daysOfWeek.includes(dayOfWeek);
}

export function isDaySpecificItem(daysOfWeek: "all" | DayOfWeek[]): boolean {
  return daysOfWeek !== "all";
}

export function formatDaysFilter(daysOfWeek: "all" | DayOfWeek[]): string {
  if (daysOfWeek === "all") {
    return "Todos os dias";
  }

  const labels: Record<DayOfWeek, string> = {
    0: "Dom",
    1: "Seg",
    2: "Ter",
    3: "Qua",
    4: "Qui",
    5: "Sex",
    6: "Sáb",
  };

  return daysOfWeek.map((day) => labels[day]).join(", ");
}
