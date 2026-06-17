import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUSD(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export function truncateMiddle(value: string, head = 6, tail = 4) {
  if (value.length <= head + tail) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

/** Splits a gross amount into commission fee + net, given a whole-percent rate. */
export function commissionBreakdown(amountCents: number, pct: number) {
  const feeCents = Math.round((amountCents * pct) / 100);
  return { feeCents, netCents: amountCents - feeCents };
}

/**
 * Returns the next calendar date that matches a day-of-month estimate
 * (1–31). If the day has already passed this month, rolls forward to next
 * month. Caps months whose last day is less than the requested day so a
 * pay-day of 31 falls back to the last day of February etc.
 */
export function nextDateForPayDay(day: number, now: Date = new Date()) {
  const safeDay = Math.max(1, Math.min(31, Math.floor(day)));
  const candidate = (year: number, monthIndex: number) => {
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    return new Date(year, monthIndex, Math.min(safeDay, lastDay));
  };
  const thisMonth = candidate(now.getFullYear(), now.getMonth());
  if (thisMonth.getTime() >= startOfDay(now).getTime()) return thisMonth;
  return candidate(now.getFullYear(), now.getMonth() + 1);
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Formats a day-of-month into an English ordinal: 1 → "1st", 22 → "22nd". */
export function ordinalDay(day: number) {
  const d = Math.floor(day);
  const tens = d % 100;
  if (tens >= 11 && tens <= 13) return `${d}th`;
  switch (d % 10) {
    case 1:
      return `${d}st`;
    case 2:
      return `${d}nd`;
    case 3:
      return `${d}rd`;
    default:
      return `${d}th`;
  }
}
