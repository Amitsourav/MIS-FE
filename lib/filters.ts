import { subDays, format as fmtDate } from "date-fns";
import type { BrandFilter, CanonicalStage } from "./types";

// Shared filter state that lives in the URL so views are shareable & refresh-safe.
export interface Filters {
  brand: BrandFilter;
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  allTime?: boolean; // when true, from/to are ignored and all_time=true is sent
  stage?: CanonicalStage | "all";
  q?: string;
  page?: number;
  pageSize?: number;
}

export const DATE_PRESETS = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
] as const;

export function ymd(d: Date): string {
  return fmtDate(d, "yyyy-MM-dd");
}

export function defaultRange(days = 30): { from: string; to: string } {
  const to = new Date();
  return { from: ymd(subDays(to, days)), to: ymd(to) };
}

/** Build a Filters object from URLSearchParams, applying defaults. */
export function parseFilters(sp: URLSearchParams): Filters {
  const { from: dFrom, to: dTo } = defaultRange();
  const brand = (sp.get("brand") as BrandFilter) || "both";
  return {
    brand: ["fmc", "av", "both"].includes(brand) ? brand : "both",
    from: sp.get("from") || dFrom,
    to: sp.get("to") || dTo,
    allTime: sp.get("all_time") === "1",
    stage: (sp.get("stage") as CanonicalStage | "all") || "all",
    q: sp.get("q") || "",
    page: sp.get("page") ? Number(sp.get("page")) : 1,
    pageSize: sp.get("page_size") ? Number(sp.get("page_size")) : 50,
  };
}

/**
 * Serialize filters to a query string for API calls. brand=both is omitted;
 * when allTime is set, from/to are dropped in favor of all_time=true.
 */
export function metricQuery(f: Filters): Record<string, string> {
  const q: Record<string, string> = f.allTime
    ? { all_time: "true" }
    : { from: f.from, to: f.to };
  if (f.brand && f.brand !== "both") q.brand = f.brand;
  return q;
}

/** Serialize filters for the leads endpoint (adds stage/q/paging). */
export function leadsQuery(f: Filters): Record<string, string> {
  const q = metricQuery(f);
  if (f.stage && f.stage !== "all") q.stage = f.stage;
  if (f.q) q.q = f.q;
  q.page = String(f.page ?? 1);
  q.page_size = String(f.pageSize ?? 50);
  return q;
}

/** Merge partial changes into existing URLSearchParams, returning a new string. */
export function updateSearchParams(
  current: URLSearchParams,
  patch: Partial<Record<string, string | number | undefined>>,
): string {
  const next = new URLSearchParams(current.toString());
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined || v === "" || v === null) next.delete(k);
    else next.set(k, String(v));
  }
  return next.toString();
}
