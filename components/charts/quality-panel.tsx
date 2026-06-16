"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { int, pct } from "@/lib/format";
import type { QualityMetrics } from "@/lib/types";

function Donut({ value, warn }: { value: number; warn: boolean }) {
  // value is a 0–1 ratio.
  const r = 26;
  const c = 2 * Math.PI * r;
  const pctVal = Math.min(Math.max(value, 0), 1);
  const dash = pctVal * c;
  const color = warn ? "#ef4444" : "#10b981";
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90">
      <circle cx="36" cy="36" r={r} fill="none" strokeWidth="8" className="stroke-muted" />
      <circle
        cx="36"
        cy="36"
        r={r}
        fill="none"
        strokeWidth="8"
        stroke={color}
        strokeDasharray={`${dash} ${c}`}
        strokeLinecap="round"
      />
    </svg>
  );
}

function Tile({
  label,
  rate,
  count,
  total,
  target,
}: {
  label: string;
  rate: number;
  count: number;
  total: number;
  target?: number;
}) {
  const warn = target !== undefined && rate > target;
  return (
    <div className="flex items-center gap-4 rounded-lg border p-4">
      <div className="relative flex items-center justify-center">
        <Donut value={rate} warn={warn} />
        <span
          className={cn(
            "absolute text-sm font-bold",
            warn ? "text-destructive" : "text-foreground",
          )}
        >
          {pct(rate, 0)}
        </span>
      </div>
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">
          {int(count)} of {int(total)}
        </p>
        {target !== undefined && (
          <p className={cn("mt-1 text-xs", warn ? "text-destructive" : "text-muted-foreground")}>
            Target ≤ {pct(target, 0)}
          </p>
        )}
      </div>
    </div>
  );
}

export function QualityPanel({
  quality,
  invalidTarget,
  duplicateTarget,
}: {
  quality: QualityMetrics;
  invalidTarget?: number;
  duplicateTarget?: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Quality</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <Tile
          label="Invalid"
          rate={quality.invalid_rate}
          count={quality.invalid}
          total={quality.delivered}
          target={invalidTarget}
        />
        <Tile
          label="Duplicates"
          rate={quality.duplicate_rate}
          count={quality.duplicates}
          total={quality.delivered}
          target={duplicateTarget}
        />
      </CardContent>
    </Card>
  );
}
