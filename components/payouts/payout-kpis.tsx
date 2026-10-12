import { IndianRupee, Wallet, Hourglass, GraduationCap, AlertTriangle } from "lucide-react";
import { KpiCard, KpiCardSkeleton } from "@/components/kpi-card";
import { inr, int, isPositive } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PayoutSummary } from "@/lib/types";

// Totals come straight from the backend summary (covers the whole filtered set,
// not just the current page). Never sum rows on the client.
export function PayoutKpis({ summary }: { summary: PayoutSummary }) {
  const hasPending = isPositive(summary.pending);
  // Paid beyond earned (pending can't go below zero). Only shown when it happens.
  const hasOverpaid = isPositive(summary.overpaid);
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2",
        hasOverpaid ? "lg:grid-cols-5" : "lg:grid-cols-4",
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
          sub="Paid beyond what was earned"
          accent="text-destructive"
          icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <KpiCardSkeleton key={i} />
      ))}
    </div>
  );
}
