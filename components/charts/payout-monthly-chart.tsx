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
import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SectionTitle } from "@/components/payouts/stat-card";
import { inr, inrCompact, int, isPositive } from "@/lib/format";
import type { PayoutMonthlyResponse } from "@/lib/types";

const DISBURSEMENT = "#4f46e5"; // indigo-600 — the primary series
const REVENUE = "#c7d2fe"; // indigo-200 — a lighter shade of the same

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
    <Card className="h-full rounded-xl">
      <CardHeader className="pb-2">
        <SectionTitle
          tone="indigo"
          icon={<BarChart3 className="h-4 w-4" />}
          title="Revenue vs Disbursement"
          description={
            <>
              <span className="font-medium text-indigo-400">Revenue</span>: what you&rsquo;ll
              earn on the full sanctioned loan, in the month it was sanctioned.{" "}
              <span className="font-medium text-indigo-700">Disbursement</span>: what
              you&rsquo;ve earned so far on money the bank has released, in the month of each
              release.
            </>
          }
        />
        <div className="flex flex-wrap gap-2 pt-3">
          <span className="inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs text-indigo-700 ring-1 ring-indigo-100">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: REVENUE }} />
            Revenue
            <span className="text-sm font-semibold tabular-nums">{inr(data.revenue_total)}</span>
          </span>
          <span className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs text-indigo-50 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-white/80" />
            Disbursement
            <span className="text-sm font-semibold tabular-nums text-white">
              {inr(data.disbursement_total)}
            </span>
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length > 0 && (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4}>
              <defs>
                <linearGradient id="pm-disb" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor={DISBURSEMENT} />
                </linearGradient>
                <linearGradient id="pm-rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e0e7ff" />
                  <stop offset="100%" stopColor={REVENUE} />
                </linearGradient>
              </defs>
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
              <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
              <Bar
                dataKey="revenue"
                name="Revenue"
                fill="url(#pm-rev)"
                stroke={REVENUE}
                radius={[6, 6, 0, 0]}
                maxBarSize={36}
              />
              <Bar
                dataKey="disbursement"
                name="Disbursement"
                fill="url(#pm-disb)"
                radius={[6, 6, 0, 0]}
                maxBarSize={36}
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
