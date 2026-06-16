"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GradeBadge } from "@/components/grade-badge";
import { pct } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Scorecard } from "@/lib/types";

// Rating is 1/3/5 per the backend; map to a 0–100 bar.
function ratingPct(rating: number) {
  return Math.min(Math.max(rating / 5, 0), 1) * 100;
}
function ratingColor(rating: number) {
  if (rating >= 5) return "#10b981";
  if (rating >= 3) return "#f59e0b";
  return "#ef4444";
}

function humanizeKey(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/\brate\b/i, "rate")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ScorecardPanel({ scorecard }: { scorecard: Scorecard }) {
  const criteria = Object.entries(scorecard.criteria);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Scorecard</CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold tabular-nums">{pct(scorecard.score_pct / 100, 0)}</span>
          <GradeBadge grade={scorecard.grade} size="lg" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {criteria.length === 0 && (
          <p className="text-sm text-muted-foreground">No criteria reported.</p>
        )}
        {criteria.map(([key, c]) => (
          <div key={key}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium">{humanizeKey(key)}</span>
              <span className="text-xs text-muted-foreground">
                weight {pct(c.weight, 0)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full transition-all")}
                  style={{ width: `${ratingPct(c.rating)}%`, backgroundColor: ratingColor(c.rating) }}
                />
              </div>
              <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
                {c.value}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
