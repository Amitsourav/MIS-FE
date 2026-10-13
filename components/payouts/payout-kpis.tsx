import {
  IndianRupee,
  Wallet,
  Hourglass,
  GraduationCap,
  AlertTriangle,
  Scale,
} from "lucide-react";
import { KpiCard, KpiCardSkeleton } from "@/components/kpi-card";
import { inr, int, isNegative, isPositive, signedInr } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PayoutSummary } from "@/lib/types";

export type PayoutViewer = "partner" | "admin";

// Totals come straight from the backend summary (covers the whole filtered set,
// not just the current page). Never sum rows on the client.
// Order: Earned · Paid · Pending · Overpaid (only if > 0) · Balance · Students.
export function PayoutKpis({
  summary,
  viewer = "partner",
}: {
  summary: PayoutSummary;
  viewer?: PayoutViewer;
}) {
  const hasPending = isPositive(summary.pending);
  // Paid above earned (pending can't go below zero). Only shown when it happens.
  const hasOverpaid = isPositive(summary.overpaid);
  // Signed net: + FMC still owes, − FMC paid extra (cut from the next bill).
  const hasBalance = summary.balance != null;
  const cards = 4 + (hasOverpaid ? 1 : 0) + (hasBalance ? 1 : 0);

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
        cards === 6 ? "xl:grid-cols-6" : cards === 5 ? "xl:grid-cols-5" : "xl:grid-cols-4",
      )}
    >
      <KpiCard label="Earned" value={inr(summary.earned)} icon={<IndianRupee className="h-4 w-4" />} />
      <KpiCard label="Paid" value={inr(summary.paid)} icon={<Wallet className="h-4 w-4" />} />
      <KpiCard
        label="Pending"
        value={inr(summary.pending)}
        accent={hasPending ? "text-amber-600" : undefined}
        icon={<Hourglass className="h-4 w-4" />}
      />
      {hasOverpaid && (
        <KpiCard
          label="Overpaid"
          value={inr(summary.overpaid)}
          sub="paid above earnings"
          accent="text-destructive"
          icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
        />
      )}
      {hasBalance && (
        <KpiCard
          label="Balance"
          value={signedInr(summary.balance)}
          sub={
            isPositive(summary.balance)
              ? viewer === "admin"
                ? "still to pay"
                : "still to be paid to you"
              : isNegative(summary.balance)
                ? "paid extra — adjusts on next bill"
                : "settled"
          }
          accent={
            isPositive(summary.balance)
              ? "text-emerald-600"
              : isNegative(summary.balance)
                ? "text-destructive"
                : undefined
          }
          icon={<Scale className="h-4 w-4" />}
        />
      )}
      <KpiCard
        label="Students"
        value={int(summary.students)}
        sub={`${inr(summary.loan_total)} in loans`}
        icon={<GraduationCap className="h-4 w-4" />}
      />
    </div>
  );
}

export function PayoutKpisSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <KpiCardSkeleton key={i} />
      ))}
    </div>
  );
}
