"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { useUnmappedPayouts } from "@/lib/queries";
import { PayoutKpis, PayoutKpisSkeleton } from "@/components/payouts/payout-kpis";
import { PayoutTable } from "@/components/payouts/payout-table";
import { EmptyState } from "@/components/empty-state";
import { QueryError } from "@/components/query-error";
import { statusOf } from "@/lib/api";
import { useLastGood } from "@/lib/use-last-good";

// FundMyCampus payouts on CRM sources no provider is mapped to, so no partner sees
// them. FMC and super admins only (AV has no payouts). Not paged: the backend
// returns every row, in its own order.
export default function UnassignedPayoutsPage() {
  const query = useUnmappedPayouts();
  const { data, error } = useLastGood(query, "Couldn't refresh unassigned payouts");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">Unassigned payouts</h1>
        <p className="text-sm text-muted-foreground">
          FundMyCampus payouts on CRM sources that aren&rsquo;t mapped to any provider, so no
          partner can see them. Map the source on the right{" "}
          <Link href="/admin/providers" className="underline underline-offset-2">
            provider
          </Link>{" "}
          and they move to that partner&rsquo;s Payout page.
        </p>
      </div>

      {!data ? (
        error ? (
          statusOf(error) === 403 ? (
            <EmptyState
              title="Not available"
              description="Unassigned payouts are for FundMyCampus and super admins."
            />
          ) : (
            <QueryError
              error={error}
              title="Couldn't load unassigned payouts"
              onRetry={() => void query.refetch()}
            />
          )
        ) : (
          <div className="space-y-4">
            <PayoutKpisSkeleton />
            <PayoutTable items={[]} loading showSource />
          </div>
        )
      ) : data.total === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="h-5 w-5" />}
          title="Nothing unassigned"
          description="Every FundMyCampus payout is on a source mapped to a provider."
        />
      ) : (
        <>
          <PayoutKpis summary={data.summary} viewer="admin" />
          <PayoutTable items={data.items} loading={false} showSource />
          <p className="text-xs text-muted-foreground">{data.total} rows</p>
        </>
      )}
    </div>
  );
}
