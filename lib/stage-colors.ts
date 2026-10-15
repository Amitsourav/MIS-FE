"use client";

import { useCallback, useRef } from "react";
import { useStages } from "./queries";
import type { Filters } from "./filters";
import type { CanonicalStage, LeadOut } from "./types";

export interface StageTone {
  pill: string; // bg + text + ring classes for the stage pill
  dot: string; // bg class for a small swatch (stage filter)
}

// Full class strings so Tailwind keeps them at build time.
const SLATE: StageTone = { pill: "bg-slate-100 text-slate-700 ring-slate-200", dot: "bg-slate-400" };
const SKY: StageTone = { pill: "bg-sky-50 text-sky-700 ring-sky-200", dot: "bg-sky-500" };
const BLUE: StageTone = { pill: "bg-blue-50 text-blue-700 ring-blue-200", dot: "bg-blue-500" };
const CYAN: StageTone = { pill: "bg-cyan-50 text-cyan-800 ring-cyan-200", dot: "bg-cyan-500" };
const TEAL: StageTone = { pill: "bg-teal-50 text-teal-700 ring-teal-200", dot: "bg-teal-500" };
const AMBER: StageTone = { pill: "bg-amber-50 text-amber-800 ring-amber-200", dot: "bg-amber-500" };
const ORANGE: StageTone = { pill: "bg-orange-50 text-orange-700 ring-orange-200", dot: "bg-orange-500" };
const LIME: StageTone = { pill: "bg-lime-50 text-lime-800 ring-lime-200", dot: "bg-lime-500" };
const GREEN: StageTone = { pill: "bg-green-50 text-green-700 ring-green-200", dot: "bg-green-500" };
const EMERALD: StageTone = { pill: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" };
const ROSE: StageTone = { pill: "bg-rose-50 text-rose-700 ring-rose-200", dot: "bg-rose-500" };
const STONE: StageTone = { pill: "bg-stone-100 text-stone-600 ring-stone-200", dot: "bg-stone-400" };

// Walked in the CRM's own stage order: early stages cool, later ones warmer then green.
const PALETTE = [SLATE, SKY, BLUE, CYAN, TEAL, AMBER, ORANGE, LIME, GREEN];

// These meanings beat position: a lost lead is red wherever its stage sits.
const FIXED: Partial<Record<CanonicalStage, StageTone>> = {
  lost: ROSE,
  dnp: STONE,
  converted: EMERALD,
};

// Used when a stage isn't in the CRM list (yet).
const BY_CANONICAL: Record<CanonicalStage, StageTone> = {
  delivered: SLATE,
  contacted: SKY,
  connected: BLUE,
  qualified: CYAN,
  in_process: TEAL,
  opportunity: AMBER,
  converted: EMERALD,
  dnp: STONE,
  lost: ROSE,
};

/**
 * One colour per CRM stage. Order comes from the all-time stage list, so a stage
 * keeps its colour when the date filter changes. Leads seen on screen teach us
 * each stage's canonical meaning, so the filter swatches match the table.
 */
export function useStageTones(filters: Filters) {
  const all = useStages({ ...filters, allTime: true });
  const canonicalOf = useRef(new Map<string, CanonicalStage>());

  const order = all.data?.map((s) => s.value) ?? [];
  const key = order.join("\u0000");

  const learn = useCallback((leads: LeadOut[]) => {
    for (const l of leads) if (l.crm_stage) canonicalOf.current.set(l.crm_stage, l.canonical_stage);
  }, []);

  const tone = useCallback(
    (crmStage: string | null | undefined, canonical?: CanonicalStage): StageTone => {
      const c = canonical ?? (crmStage ? canonicalOf.current.get(crmStage) : undefined);
      if (c && FIXED[c]) return FIXED[c]!;
      const i = crmStage ? order.indexOf(crmStage) : -1;
      if (i >= 0) return PALETTE[i % PALETTE.length];
      return c ? BY_CANONICAL[c] : SLATE;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  return { tone, learn };
}
