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
import { format, parse } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { inr, inrCompact, int, isPositive } from "@/lib/format";
import type { PayoutMonthlyResponse } from "@/lib/types";

const DISBURSEMENT = "#10b981"; // emerald-500 — the primary series
const REVENUE = "#a7f3d0"; // emerald-200 — a lighter shade of the same

function monthDate(m: string) {
  return parse(m, "yyyy-MM", new Date());
}

// Revenue vs Disbursement by month: 2 grouped bars per month on one ₹ axis.
// Values are the API's own; Number() is only for bar heights, inr() for text.
export function PayoutMonthlyChart({ data }: { data: PayoutMonthlyResponse }) {
  const rows = data.months.map((m) => ({
    label: format(monthDate(m.month), "MMM yy"),
    full: format(monthDate(m.month), "MMMM yyyy"),
    revenue: Number(m.revenue),
    disbursement: Number(m.disbursement),
    revenueText: inr(m.revenue),
    disbursementText: inr(m.disbursement),
  }));
  const datedByRelease = data.revenue_dated_by_first_release;
  const undated = isPositive(data.revenue_undated);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 space-y-0 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <CardTitle>Revenue vs Disbursement</CardTitle>
          <CardDescription className="max-w-2xl">
            Revenue: what you&rsquo;ll earn on the full sanctioned loan, in the month it was
            sanctioned. Disbursement: what you&rsquo;ve earned so far on money the bank has
            released, in the month of each release.
          </CardDescription>
        </div>
        <p className="shrink-0 text-sm tabular-nums text-muted-foreground">
          Revenue <span className="font-medium text-foreground">{inr(data.revenue_total)}</span>
          {" · "}
          Disbursement{" "}
          <span className="font-medium text-foreground">{inr(data.disbursement_total)}</span>
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length > 0 && (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={56}
                tickFormatter={(v: number) => inrCompact(v)}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))" }}
                contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }}
                labelFormatter={(_l, payload) => payload?.[0]?.payload.full ?? ""}
                formatter={(_v, name, item) => {
                  const r = item.payload as (typeof rows)[number];
                  return [name === "Revenue" ? r.revenueText : r.disbursementText, name];
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="revenue" name="Revenue" fill={REVENUE} radius={[4, 4, 0, 0]} />
              <Bar
                dataKey="disbursement"
                name="Disbursement"
                fill={DISBURSEMENT}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
        {datedByRelease > 0 && (
          <p className="text-xs text-muted-foreground">
            Sanction date not recorded for {int(datedByRelease)}{" "}
            {datedByRelease === 1 ? "loan" : "loans"} — their revenue is shown in the month of the
            first release.
          </p>
        )}
        {undated && (
          <p className="text-xs text-muted-foreground">
            {inr(data.revenue_undated)} of revenue has no date yet and isn&rsquo;t shown in any
            month.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
