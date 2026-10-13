import {
  IndianRupee,
  Wallet,
  Hourglass,
  GraduationCap,
  AlertTriangle,
  Scale,
} from "lucide-react";
import { KpiCardSkeleton } from "@/components/kpi-card";
import { StatCard } from "./stat-card";
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
      <StatCard
        tone="blue"
        label="Earned"
        value={inr(summary.earned)}
        sub="on money the bank has released"
        icon={<IndianRupee className="h-4 w-4" />}
      />
      <StatCard
        tone="emerald"
        label="Paid"
        value={inr(summary.paid)}
        sub="by FundMyCampus"
        icon={<Wallet className="h-4 w-4" />}
      />
      <StatCard
        tone={hasPending ? "amber" : "slate"}
        label="Pending"
        value={inr(summary.pending)}
        sub={hasPending ? "still to be paid" : "nothing pending"}
        icon={<Hourglass className="h-4 w-4" />}
      />
      {hasOverpaid && (
        <StatCard
          tone="rose"
          label="Overpaid"
          value={inr(summary.overpaid)}
          sub="paid above earnings"
          icon={<AlertTriangle className="h-4 w-4" />}
        />
      )}
      {hasBalance && (
        <StatCard
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
          tone={
            isPositive(summary.balance)
              ? "emerald"
              : isNegative(summary.balance)
                ? "rose"
                : "slate"
          }
          icon={<Scale className="h-4 w-4" />}
        />
      )}
      <StatCard
        tone="teal"
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
