"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { inr, isNegative, isPositive, pct, signedInr } from "@/lib/format";
import type { PayoutSummary } from "@/lib/types";

// The 5 slices add up exactly to `earned` (backend guarantee), in this order.
const SLICES = [
  { key: "cash_transferred", label: "Cash transferred", color: "#10b981" }, // emerald-500
  { key: "tds", label: "TDS deducted", color: "#94a3b8" }, // slate-400
  { key: "invoice_overdue", label: "Invoice overdue", color: "#ef4444" }, // red-500
  { key: "invoice_raised", label: "Invoice raised", color: "#f59e0b" }, // amber-500
  { key: "invoice_not_raised", label: "Invoice not raised", color: "#60a5fa" }, // blue-400
] as const;

// "Where your money is": a donut of the summary's earned split. Values are the
// API's own; the % of earned in the legend is the only client maths (display only).
export function PayoutStatusPie({ summary }: { summary: PayoutSummary }) {
  const earned = Number(summary.earned);
  const slices = SLICES.map((s) => ({ ...s, value: summary[s.key] }))
    .filter((s) => isPositive(s.value))
    .map((s) => ({ ...s, amount: Number(s.value) }));

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Where your money is</CardTitle>
        <CardDescription>Your earnings, by what&rsquo;s happened to them.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="relative mx-auto h-[200px] w-full max-w-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }}
                formatter={(_v, _n, item) => {
                  const s = item.payload as (typeof slices)[number];
                  return [inr(s.value), s.label];
                }}
              />
              <Pie
                data={slices}
                dataKey="amount"
                nameKey="label"
                innerRadius="64%"
                outerRadius="100%"
                paddingAngle={slices.length > 1 ? 2 : 0}
                stroke="none"
                isAnimationActive={false}
              >
                {slices.map((s) => (
                  <Cell key={s.key} fill={s.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold tabular-nums">{inr(summary.earned)}</span>
            <span className="text-xs text-muted-foreground">Total earned</span>
          </div>
        </div>

        <ul className="space-y-1.5 text-sm">
          {slices.map((s) => (
            <li key={s.key} className="flex flex-wrap items-center gap-x-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: s.color }} />
              <span>{s.label}</span>
              <span className="ml-auto tabular-nums">
                {inr(s.value)}
                <span className="ml-2 text-xs text-muted-foreground">
                  {earned > 0 ? pct(s.amount / earned) : "—"}
                </span>
              </span>
            </li>
          ))}
        </ul>

        {(isPositive(summary.overpaid) || summary.balance != null) && (
          <div className="space-y-1 border-t pt-3 text-xs">
            {isPositive(summary.overpaid) && (
              <p className="text-destructive">
                {inr(summary.overpaid)} paid above earnings — adjusts on the next bill.
              </p>
            )}
            {isPositive(summary.balance) && (
              <p className="text-muted-foreground">
                Net still to be paid: {signedInr(summary.balance)}
              </p>
            )}
            {isNegative(summary.balance) && (
              <p className="text-muted-foreground">Net paid extra: {signedInr(summary.balance)}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
