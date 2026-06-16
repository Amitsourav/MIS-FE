import type { CanonicalStage, Grade } from "./types";

// Order of stages used to render the conversion funnel.
export const FUNNEL_ORDER: CanonicalStage[] = [
  "delivered",
  "contacted",
  "connected",
  "qualified",
  "in_process",
  "converted",
];

// All stages get a consistent color everywhere (badges, charts, funnel).
// Values are hex so they work both in Tailwind arbitrary classes and Recharts.
export const STAGE_COLORS: Record<CanonicalStage, string> = {
  delivered: "#94a3b8", // slate-400
  contacted: "#60a5fa", // blue-400
  connected: "#38bdf8", // sky-400
  qualified: "#22d3ee", // cyan-400
  in_process: "#818cf8", // indigo-400
  converted: "#10b981", // emerald-500
  opportunity: "#f59e0b", // amber-500
  dnp: "#9ca3af", // gray-400 (muted)
  lost: "#ef4444", // red-500
};

// Human-readable stage labels.
export const STAGE_LABELS: Record<CanonicalStage, string> = {
  delivered: "Delivered",
  contacted: "Contacted",
  connected: "Connected",
  qualified: "Qualified",
  in_process: "In Process",
  converted: "Converted",
  opportunity: "Opportunity",
  dnp: "DNP",
  lost: "Lost",
};

// Grade -> color family (used to build classes / chart fills).
export const GRADE_COLORS: Record<Grade, string> = {
  A: "#10b981", // emerald
  B: "#22c55e", // green
  C: "#f59e0b", // amber
  D: "#f97316", // orange
  F: "#ef4444", // red
};

// Tailwind class sets for grade badges (bg/text/border).
export const GRADE_BADGE_CLASSES: Record<Grade, string> = {
  A: "bg-emerald-100 text-emerald-700 border-emerald-200",
  B: "bg-green-100 text-green-700 border-green-200",
  C: "bg-amber-100 text-amber-700 border-amber-200",
  D: "bg-orange-100 text-orange-700 border-orange-200",
  F: "bg-red-100 text-red-700 border-red-200",
};

export const BRAND_LABELS: Record<string, string> = {
  fmc: "FundMyCampus",
  av: "Admitverse",
  both: "Both Brands",
};

export const BRAND_SHORT: Record<string, string> = {
  fmc: "FMC",
  av: "AV",
  both: "Both",
};
