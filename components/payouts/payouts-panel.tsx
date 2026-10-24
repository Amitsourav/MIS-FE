"use client";

import { CalendarRange, Download, Info, ListChecks } from "lucide-react";
import { useState } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { Pagination } from "@/components/pagination";
import { DateRangePicker } from "@/components/shell/date-range-picker";
import { DataAsOf } from "@/components/shell/data-as-of";
import { PayoutKpis, PayoutKpisSkeleton, type PayoutViewer } from "./payout-kpis";
import { PayoutStatusPie } from "@/components/charts/payout-status-pie";
import { SectionTitle } from "./stat-card";
import { PayoutTable } from "./payout-table";
import { GstSwitch } from "./gst-switch";
import { PayoutsNone, PayoutsUnsupported } from "./payout-empty";
import { QueryError } from "@/components/query-error";
import { statusOf } from "@/lib/api";
import { useLastGood } from "@/lib/use-last-good";
import { PayoutMonthlyChart } from "@/components/charts/payout-monthly-chart";
import { ChartSkeleton } from "@/components/skeletons";
import { Card, CardContent } from "@/components/ui/card";
import { int, isPositive } from "@/lib/format";
import type { PayoutFilters, PayoutMonthlyResponse, PayoutsResponse } from "@/lib/types";

// Shared by the provider Payout page and the admin provider "Payouts" tab.
// The parent owns filter/paging state (URL for providers, local for admins) and the
// query; this renders every state from that. `exportHref` omitted = no Export button.
export function PayoutsPanel({
  query,
  monthlyQuery,
  filters,
  onFiltersChange,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  exportHref,
  viewer = "partner",
  actions,
  footer,
}: {
  query: UseQueryResult<PayoutsResponse>;
  monthlyQuery: UseQueryResult<PayoutMonthlyResponse>;
  filters: PayoutFilters;
  onFiltersChange: (f: PayoutFilters) => void;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  exportHref?: string;
  viewer?: PayoutViewer;
  actions?: React.ReactNode; // next to Export CSV (partner: "Raise invoice")
  footer?: React.ReactNode; // below the payout table (partner: "My invoices")
}) {
  // Keeps the last good response on screen (with a toast) if a refresh fails.
  const { data, error } = useLastGood(query, "Couldn't refresh payouts");
  const allTime = !filters.date_from && !filters.date_to;
  // Payout details: Earned / Pending / Balance with or without GST.
  const [withGst, setWithGst] = useState(true);

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
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="hidden h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-blue-100 sm:flex">
            <CalendarRange className="h-4 w-4" />
          </span>
          <DateRangePicker
            from={filters.date_from ?? ""}
            to={filters.date_to ?? ""}
            allTime={allTime}
            onChange={(r) => onFiltersChange({ date_from: r.from, date_to: r.to })}
            onAllTime={() => onFiltersChange({})}
          />
          <span className="text-xs text-muted-foreground">Filtered by release date</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DataAsOf value={data.data_as_of} />
          {actions}
          {exportHref !== undefined && (
            <Button
              size="sm"
              disabled={empty}
              className="shadow-sm"
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
          <PayoutKpis
            summary={data.summary}
            viewer={viewer}
            revenue={monthlyQuery.data?.brand_supported ? monthlyQuery.data.revenue_total : undefined}
          />
          {/* Bar graph and "Where your money is" side by side on desktop, stacked on mobile. */}
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="min-w-0 lg:col-span-2">
              <MonthlySection query={monthlyQuery} />
            </div>
            {isPositive(data.summary.earned) && <PayoutStatusPie summary={data.summary} />}
          </div>
          <Card className="overflow-hidden rounded-xl">
            <div className="border-b px-5 py-4">
              <SectionTitle
                tone="sky"
                icon={<ListChecks className="h-4 w-4" />}
                title="Payout details"
                description="One row per student and lender, latest release first."
                right={
                  <div className="flex flex-wrap items-center gap-2 self-start">
                    <GstSwitch value={withGst} onChange={setWithGst} />
                    <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 ring-1 ring-sky-100">
                      {int(data.total)} {data.total === 1 ? "row" : "rows"}
                    </span>
                  </div>
                }
              />
            </div>
            <PayoutTable
              items={data.items}
              loading={false}
              bare
              leadLinks={viewer === "partner"}
              gst={withGst}
            />
            <div className="border-t px-4 py-3">
              <Pagination
                page={page}
                pageSize={pageSize}
                total={data.total}
                fetching={query.isFetching}
                onPageChange={onPageChange}
                onPageSizeChange={onPageSizeChange}
              />
            </div>
          </Card>
        </>
      )}

      {footer}

      <div className="flex gap-3 rounded-xl border border-sky-100 bg-sky-50/70 px-4 py-3 text-sm text-sky-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
        <p>
          You earn your rate on the amount the bank has released, and it grows with each tranche.
          &lsquo;Paid&rsquo; is what FundMyCampus has paid you.
        </p>
      </div>
    </div>
  );
}

// Revenue vs Payout card, same date filter as the table. Hidden for brands
// without payouts, and when there are no months and no note to show.
function MonthlySection({ query }: { query: UseQueryResult<PayoutMonthlyResponse> }) {
  const { data, error } = useLastGood(query, "Couldn't refresh payouts");
  if (!data) {
    if (error) {
      return (
        <Card>
          <CardContent className="py-2">
            <QueryError
              className="border-0"
              error={error}
              title="Couldn't load the monthly chart"
              onRetry={() => void query.refetch()}
            />
          </CardContent>
        </Card>
      );
    }
    return <ChartSkeleton />;
  }
  if (!data.brand_supported) return null;
  const hasNotes = data.revenue_dated_by_first_release > 0 || isPositive(data.revenue_undated);
  if (data.months.length === 0 && !hasNotes) return null;
  return <PayoutMonthlyChart data={data} />;
}

