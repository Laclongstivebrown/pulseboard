import type { CurrencyCode } from "./schemas";

const MS_PER_DAY = 86_400_000;

export function formatCurrency(
  amount: number,
  currency: CurrencyCode = "USD",
  options?: { compact?: boolean; signed?: boolean }
): string {
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: options?.compact && abs >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: options?.compact && abs >= 10_000 ? 1 : 0,
  }).format(abs);

  if (amount < 0) return `-${formatted}`;
  if (options?.signed && amount > 0) return `+${formatted}`;
  return formatted;
}

export function formatCurrencyExact(
  amount: number,
  currency: CurrencyCode = "USD"
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function toIsoDate(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseIsoDateUtc(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

export function addDaysIso(iso: string, days: number): string {
  const base = parseIsoDateUtc(iso).getTime();
  return toIsoDate(new Date(base + days * MS_PER_DAY));
}

export function diffDaysIso(fromIso: string, toIso: string): number {
  const from = parseIsoDateUtc(fromIso).getTime();
  const to = parseIsoDateUtc(toIso).getTime();
  return Math.round((to - from) / MS_PER_DAY);
}

export function formatShortDate(iso: string): string {
  const date = parseIsoDateUtc(iso);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatMonthDayYear(iso: string): string {
  const date = parseIsoDateUtc(iso);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
