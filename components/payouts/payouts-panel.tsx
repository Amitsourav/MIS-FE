"use client";

import { Download } from "lucide-react";
import type { UseQueryResult } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { Pagination } from "@/components/pagination";
import { DateRangePicker } from "@/components/shell/date-range-picker";
import { DataAsOf } from "@/components/shell/data-as-of";
import { PayoutKpis, PayoutKpisSkeleton } from "./payout-kpis";
import { PayoutTable } from "./payout-table";
import { PayoutsNone, PayoutsUnsupported } from "./payout-empty";
import { QueryError } from "@/components/query-error";
import { statusOf } from "@/lib/api";
import { useLastGood } from "@/lib/use-last-good";
import type { PayoutFilters, PayoutsResponse } from "@/lib/types";

// Shared by the provider Payout page and the admin provider "Payouts" tab.
// The parent owns filter/paging state (URL for providers, local for admins) and the
// query; this renders every state from that. `exportHref` omitted = no Export button.
export function PayoutsPanel({
  query,
  filters,
  onFiltersChange,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  exportHref,
}: {
  query: UseQueryResult<PayoutsResponse>;
  filters: PayoutFilters;
  onFiltersChange: (f: PayoutFilters) => void;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  exportHref?: string;
}) {
  // Keeps the last good response on screen (with a toast) if a refresh fails.
  const { data, error } = useLastGood(query, "Couldn't refresh payouts");
  const allTime = !filters.date_from && !filters.date_to;

  if (!data) {
    if (error) {
      if (statusOf(error) === 404) {
        return <EmptyState title="Provider not found" description="It may be outside your company." />;
      }
      return (
        <QueryError error={error} title="Couldn't load payouts" onRetry={() => query.refetch()} />
      );
    }
    return (
      <div className="space-y-4">
        <PayoutKpisSkeleton />
        <PayoutTable items={[]} loading />
      </div>
    );
  }

  if (!data.brand_supported) return <PayoutsUnsupported />;

  const empty = data.total === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker
            from={filters.date_from ?? ""}
            to={filters.date_to ?? ""}
            allTime={allTime}
            onChange={(r) => onFiltersChange({ date_from: r.from, date_to: r.to })}
            onAllTime={() => onFiltersChange({})}
          />
          <span className="text-xs text-muted-foreground">Filtered by PF-paid date</span>
        </div>
        <div className="flex items-center gap-3">
          <DataAsOf value={data.data_as_of} />
          {exportHref !== undefined && (
            <Button
              variant="outline"
              size="sm"
              disabled={empty}
              onClick={() => {
                window.location.href = exportHref;
              }}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {empty ? (
        // KPI cards are hidden when there are no rows (consistently, for any range).
        <PayoutsNone onShowAllTime={allTime ? undefined : () => onFiltersChange({})} />
      ) : (
        <>
          <PayoutKpis summary={data.summary} />
          <PayoutTable items={data.items} loading={false} />
          <Pagination
            page={page}
            pageSize={pageSize}
            total={data.total}
            fetching={query.isFetching}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </>
      )}

      <p className="text-xs text-muted-foreground">
        You earn your agreed rate on the loan amount once the student pays the processing fee to
        the lender. Sanctioned loans appear here once PF is paid. &lsquo;Paid&rsquo; is what
        FundMyCampus has paid you.
      </p>
    </div>
  );
}
