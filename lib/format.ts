import { parseISO } from "date-fns";

// Formatting helpers. Backend sends rates as 0–1 ratios; pct() renders them.

const numberFmt = new Intl.NumberFormat("en-US");

/** Render a 0–1 ratio as a percentage string, e.g. 0.123 -> "12.3%". */
export function pct(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${(n * 100).toFixed(digits)}%`;
}

/** Render an integer with thousands separators. */
export function int(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return numberFmt.format(Math.round(n));
}

/** Safe ratio of a/b (returns 0 when b is 0). */
export function ratio(a: number, b: number): number {
  if (!b) return 0;
  return a / b;
}

/** Render a duration in seconds as a friendly string. */
export function duration(sec: number | null | undefined): string {
  if (sec === null || sec === undefined || Number.isNaN(sec)) return "—";
  if (sec < 60) return `${Math.round(sec)}s`;
  const min = sec / 60;
  if (min < 60) return `${Math.round(min)}m`;
  const hours = min / 60;
  if (hours < 24) {
    const h = Math.floor(hours);
    const m = Math.round(min - h * 60);
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  const days = hours / 24;
  return `${days.toFixed(1)} days`;
}

/** Localized date from an ISO string. */
export function date(iso: string | null | undefined): string {
  if (!iso) return "—";
  // A bare YYYY-MM-DD is a calendar date: parse it as local, not UTC midnight
  // (new Date("2026-08-20") renders as Aug 19 west of UTC).
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? parseISO(iso) : new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Localized date + time. */
export function dateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Just the HH:MM portion (for the "Data as of" chip). */
export function timeOnly(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

const inrFmt = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const inrPaiseFmt = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Money string -> Indian-grouped rupees, paise only when non-zero.
 * "1234567.5" -> "₹12,34,567.50", "81180.00" -> "₹81,180". Display only — never sum.
 */
export function inr(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  const hasPaise = Math.round(n * 100) % 100 !== 0;
  return (hasPaise ? inrPaiseFmt : inrFmt).format(n);
}

/** Percent string -> label: "0.60" -> "0.6%", "1.00" -> "1%"; null -> null (caller shows "Agreed"). */
export function ratePct(rate: string | null | undefined): string | null {
  if (rate == null || rate === "") return null;
  const n = Number(rate);
  return Number.isFinite(n) ? `${n}%` : null;
}
