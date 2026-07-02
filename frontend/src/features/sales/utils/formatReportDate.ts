export function formatSaleTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getSaleSessionStart(sale: { openedAt?: string; paidAt: string }): string {
  return sale.openedAt ?? sale.paidAt;
}

export function formatSaleSessionTime(sale: {
  openedAt?: string;
  paidAt: string;
}): string {
  const startAt = getSaleSessionStart(sale);
  if (!sale.openedAt || sale.openedAt === sale.paidAt) {
    return formatSaleTime(sale.paidAt);
  }

  return `${formatSaleTime(startAt)}–${formatSaleTime(sale.paidAt)}`;
}

export function formatSessionDurationMinutes(
  startAt: string,
  endAt: string,
): string | null {
  const durationMinutes = Math.round(
    (new Date(endAt).getTime() - new Date(startAt).getTime()) / 60_000,
  );

  if (durationMinutes <= 0) {
    return null;
  }

  if (durationMinutes < 60) {
    return `${durationMinutes} min`;
  }

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
}

export function formatReportDate(date: Date): string {
  return date.toLocaleDateString("pt-PT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function formatReportDateShort(date: Date): string {
  return date.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function getLocalDateKey(isoDate: string): string {
  const date = new Date(isoDate);
  return getDateKeyFromDate(date);
}

export function getDateKeyFromDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseLocalDateKey(dateKey: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) {
    return null;
  }

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}
