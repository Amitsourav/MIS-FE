"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BRAND_LABELS, STAGE_COLORS } from "@/lib/tokens";
import { pct } from "@/lib/format";
import type { BrandSplitRow } from "@/lib/types";

export function BrandSplitChart({ rows }: { rows: BrandSplitRow[] }) {
  const data = rows.map((r) => ({
    brand: BRAND_LABELS[r.brand] ?? r.brand,
    delivered: r.funnel.delivered,
    valid: r.quality.valid,
    qualified: r.funnel.qualified,
    converted: r.funnel.converted,
    convRate: r.rates.conversion_rate,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Brand Split</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
            <XAxis dataKey="brand" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={48} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="delivered" name="Delivered" fill={STAGE_COLORS.delivered} radius={[3, 3, 0, 0]} />
            <Bar dataKey="valid" name="Valid" fill={STAGE_COLORS.connected} radius={[3, 3, 0, 0]} />
            <Bar dataKey="qualified" name="Qualified" fill={STAGE_COLORS.qualified} radius={[3, 3, 0, 0]} />
            <Bar dataKey="converted" name="Converted" fill={STAGE_COLORS.converted} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {rows.map((r) => (
            <div key={r.brand} className="rounded-lg border p-3">
              <p className="text-sm font-medium">{BRAND_LABELS[r.brand] ?? r.brand}</p>
              <dl className="mt-2 space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <dt>Contact rate</dt>
                  <dd className="tabular-nums text-foreground">{pct(r.rates.contact_rate)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Qualification rate</dt>
                  <dd className="tabular-nums text-foreground">{pct(r.rates.qualification_rate)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Conversion rate</dt>
                  <dd className="tabular-nums text-foreground">{pct(r.rates.conversion_rate)}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
