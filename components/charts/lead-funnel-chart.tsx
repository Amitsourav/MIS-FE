"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { int, pct } from "@/lib/format";
import type { FunnelStep } from "@/lib/types";

// Cool to green as a lead moves toward money: navy, blue, sky, teal, emerald.
const STEP_COLORS: Record<FunnelStep["key"], string> = {
  all: "#1e3a5f",
  logged_in: "#2563eb",
  sanctioned: "#0ea5e9",
  pf_paid: "#14b8a6",
  disbursed: "#10b981",
};

// Loan pipeline: one horizontal bar per step, in API order. Counts are cumulative
// (a disbursed student also counts in Login, Sanction and PF paid), so they never rise.
// The only client maths is the share of All leads, for the labels.
export function LeadFunnelChart({ steps }: { steps: FunnelStep[] }) {
  const all = steps[0]?.count ?? 0;
  const rows = steps.map((s, i) => ({
    ...s,
    // "11 · 12.6%" from step 2 on; "—" share when All leads is 0.
    display:
      i === 0 ? int(s.count) : `${int(s.count)} · ${all > 0 ? pct(s.count / all) : "—"}`,
    // Step-to-step conversion, shown in the tooltip.
    fromPrev:
      i === 0
        ? null
        : steps[i - 1].count > 0
          ? `${pct(s.count / steps[i - 1].count, 0)} of ${steps[i - 1].label}`
          : null,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Loan pipeline</CardTitle>
        <CardDescription>
          Leads that reached each step or went further, by the date the lead came in.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={rows.length * 44 + 16}>
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 0, right: 96, left: 0, bottom: 0 }}
            barCategoryGap={8}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
            <XAxis type="number" hide domain={[0, "dataMax"]} />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={76}
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted))" }}
              contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }}
              formatter={(_v, _n, item) => {
                const r = item.payload as (typeof rows)[number];
                return [r.fromPrev ? `${r.display} (${r.fromPrev})` : r.display, "Leads"];
              }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} minPointSize={2}>
              {rows.map((r) => (
                <Cell key={r.key} fill={STEP_COLORS[r.key] ?? "#2563eb"} />
              ))}
              <LabelList
                dataKey="display"
                position="right"
                className="fill-foreground"
                style={{ fontSize: 12 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
