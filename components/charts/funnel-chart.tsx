"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STAGE_COLORS, STAGE_LABELS } from "@/lib/tokens";
import { int, pct, ratio } from "@/lib/format";
import type { CanonicalStage, FunnelCounts } from "@/lib/types";

// FunnelCounts only carries these stages (in funnel order).
const ORDER: CanonicalStage[] = ["delivered", "contacted", "connected", "qualified", "converted"];

export function FunnelChart({ funnel }: { funnel: FunnelCounts }) {
  const top = funnel.delivered || 1;
  const rows = ORDER.map((stage, i) => {
    const value = (funnel as unknown as Record<string, number>)[stage] ?? 0;
    const prev = i === 0 ? value : (funnel as unknown as Record<string, number>)[ORDER[i - 1]] ?? 0;
    const dropOff = i === 0 ? 0 : prev - value;
    const dropPct = i === 0 ? 0 : ratio(dropOff, prev || 1);
    return { stage, value, widthPct: ratio(value, top) * 100, dropPct, dropOff };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversion Funnel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {rows.map((r) => (
          <div key={r.stage}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium">{STAGE_LABELS[r.stage]}</span>
              <span className="tabular-nums text-muted-foreground">
                {int(r.value)}
                {r.dropPct > 0 && (
                  <span className="ml-2 text-xs text-destructive">
                    −{pct(r.dropPct)} ({int(r.dropOff)})
                  </span>
                )}
              </span>
            </div>
            <div className="h-7 w-full overflow-hidden rounded-md bg-muted">
              <div
                className="flex h-full items-center rounded-md transition-all"
                style={{
                  width: `${Math.max(r.widthPct, 2)}%`,
                  backgroundColor: STAGE_COLORS[r.stage],
                }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
