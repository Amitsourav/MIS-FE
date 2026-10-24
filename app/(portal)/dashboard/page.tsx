"use client";

import { useState } from "react";
import {
  Inbox,
  Users,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  Percent,
  Landmark,
  IndianRupee,
  Hourglass,
  Wallet,
} from "lucide-react";
import { useUrlFilters } from "@/lib/use-filters";
import {
  useOverview,
  useTrends,
  useBrandSplit,
  useQuality,
  useLeadFunnel,
  usePayouts,
} from "@/lib/queries";
import { KpiCardSkeleton } from "@/components/kpi-card";
import { StatCard } from "@/components/payouts/stat-card";
import { FunnelChart } from "@/components/charts/funnel-chart";
import { TrendChart } from "@/components/charts/trend-chart";
import { BrandSplitChart } from "@/components/charts/brand-split-chart";
import { QualityPanel } from "@/components/charts/quality-panel";
import { LeadFunnelChart } from "@/components/charts/lead-funnel-chart";
import { Button } from "@/components/ui/button";
import { ScorecardPanel } from "@/components/scorecard-panel";
import { EmptyState } from "@/components/empty-state";
import { ChartSkeleton, PanelSkeleton } from "@/components/skeletons";
import { QueryError } from "@/components/query-error";
import { useLastGood } from "@/lib/use-last-good";
import { Card, CardContent } from "@/components/ui/card";
import { gstPct, inr, int, isPositive, pct, ratePct, ratio } from "@/lib/format";
import type { FunnelStep, OverviewResponse, PayoutSummary } from "@/lib/types";

export default function DashboardPage() {
  const { filters, setFilters } = useUrlFilters();
  const [granularity, setGranularity] = useState<"day" | "week">("day");

  const overview = useOverview(filters);
  const trends = useTrends(filters, granularity);
  const brandSplit = useBrandSplit(filters);
  const quality = useQuality(filters);
  const leadFunnel = useLeadFunnel(filters);
  // Money tiles follow the dashboard dates (by the bank's release date). The
  // payout rate is all time. Both share the Payout page's cache when all time.
  const payouts = usePayouts(
    filters.allTime ? {} : { date_from: filters.from, date_to: filters.to },
    1,
    50,
  );
  const payoutsAll = usePayouts({}, 1, 50);

  // Each panel keeps its last good data if a live refresh fails.
  const ov = useLastGood(overview);
  const tr = useLastGood(trends);
  const bs = useLastGood(brandSplit);
  const ql = useLastGood(quality);
  const lf = useLastGood(leadFunnel);

  const o = ov.data;
  // FundMyCampus partners get the Loan pipeline; the canonical Conversion
  // Funnel is only for Admitverse (it would repeat the same counts).
  const loanPipeline = lf.data?.brand_supported;
  const showBrandSplit = (bs.data?.rows.length ?? 0) > 1;
  const money = payouts.data?.brand_supported ? payouts.data.summary : undefined;
  const rate = payoutsAll.data?.brand_supported ? payoutsAll.data.summary : undefined;

  function cardError(error: unknown, retry: () => unknown) {
    return (
      <Card>
        <CardContent className="py-2">
          <QueryError className="border-0" error={error} onRetry={() => void retry()} />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Performance of the leads you supplied.
        </p>
      </div>

      {/* KPIs, funnel and scorecard all come from the overview: without it, show one error. */}
      {ov.error ? (
        <QueryError
          error={ov.error}
          onRetry={() => {
            void overview.refetch();
            void trends.refetch();
            void brandSplit.refetch();
            void quality.refetch();
            void leadFunnel.refetch();
          }}
        />
      ) : (
        <>
          {/* KPI cards: loans and money for FundMyCampus, lead outcomes for Admitverse. */}
          {!o || (!lf.data && !lf.error) ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <KpiCardSkeleton key={i} />
              ))}
            </div>
          ) : loanPipeline && lf.data ? (
            <LoanTiles
              leads={o.funnel.delivered}
              steps={lf.data.steps}
              money={money}
              rate={rate}
              allTime={!!filters.allTime}
            />
          ) : (
            <LeadTiles o={o} />
          )}

          {/* Loan pipeline (FundMyCampus only: hidden when brand_supported is false) */}
          {lf.error ? (
            cardError(lf.error, leadFunnel.refetch)
          ) : !lf.data ? (
            <ChartSkeleton height={236} />
          ) : !lf.data.brand_supported ? null : (lf.data.steps[0]?.count ?? 0) === 0 ? (
            <Card>
              <CardContent className="py-2">
                <EmptyState title="No leads in this date range" className="border-0">
                  {!filters.allTime && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFilters({ all_time: "1", from: undefined, to: undefined })}
                    >
                      Show all time
                    </Button>
                  )}
                </EmptyState>
              </CardContent>
            </Card>
          ) : (
            <LeadFunnelChart steps={lf.data.steps} />
          )}

          {/* Empty state for the range */}
          {o && o.funnel.delivered === 0 ? (
            <Card>
              <CardContent className="py-2">
                <EmptyState
                  title="No leads in this period"
                  description="Try widening the date range or switching brands using the filters above."
                />
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Funnel (Admitverse only; FMC has the Loan pipeline above) + Trend */}
              <div className={loanPipeline ? "grid gap-6" : "grid gap-6 lg:grid-cols-2"}>
                {loanPipeline ? null : !o || (!lf.data && !lf.error) ? <ChartSkeleton /> : <FunnelChart funnel={o.funnel} />}
                {tr.error ? (
                  cardError(tr.error, trends.refetch)
                ) : !tr.data ? (
                  <ChartSkeleton />
                ) : (
                  <TrendChart
                    points={tr.data.points}
                    granularity={granularity}
                    onGranularityChange={setGranularity}
                  />
                )}
              </div>

              {/* Brand split (only when provider has both brands) */}
              {bs.error ? (
                cardError(bs.error, brandSplit.refetch)
              ) : !bs.data ? (
                <ChartSkeleton />
              ) : (
                showBrandSplit && <BrandSplitChart rows={bs.data.rows} />
              )}

              {/* Quality + Scorecard */}
              <div className="grid gap-6 lg:grid-cols-2">
                {ql.error ? (
                  cardError(ql.error, quality.refetch)
                ) : !ql.data ? (
                  <PanelSkeleton />
                ) : (
                  <QualityPanel quality={ql.data} />
                )}
                {!o ? (
                  <PanelSkeleton />
                ) : o.scorecard ? (
                  <ScorecardPanel scorecard={o.scorecard} />
                ) : (
                  <Card>
                    <CardContent className="py-2">
                      <EmptyState title="No scorecard yet" description="A scorecard appears once enough leads are delivered in this range." />
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// FundMyCampus: what matters to a loan partner. Counts are by lead created date;
// money is by the bank's release date. Login/Sanction/PF counts are in the
// Loan pipeline below, so they aren't repeated here.
function LoanTiles({
  leads,
  steps,
  money,
  rate,
  allTime,
}: {
  leads: number;
  steps: FunnelStep[];
  money?: PayoutSummary;
  rate?: PayoutSummary;
  allTime: boolean;
}) {
  const disbursed = steps.find((s) => s.key === "disbursed")?.count ?? 0;
  const plus = money ? ` + ${gstPct(money.gst_rate)} GST` : "";
  const period = allTime ? "" : " · released in this period";
  const payoutRate = ratePct(rate?.payout_rate);
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
      <StatCard
        tone="navy"
        label="Leads sent"
        value={int(leads)}
        sub={`${int(disbursed)} disbursed · ${pct(ratio(disbursed, leads), 0)}`}
        icon={<Inbox className="h-4 w-4" />}
      />
      {money ? (
        <>
          <StatCard
            tone="teal"
            label="Loan disbursed"
            value={inr(money.released_total ?? "0")}
            sub={`by banks for ${int(money.students)} ${money.students === 1 ? "student" : "students"}${period}`}
            icon={<Landmark className="h-4 w-4" />}
          />
          <StatCard
            tone="blue"
            label={`Earned${plus}`}
            value={inr(money.earned_with_gst ?? money.earned)}
            sub={`Without GST: ${inr(money.earned)}`}
            icon={<IndianRupee className="h-4 w-4" />}
          />
          <StatCard
            tone="emerald"
            label={`Paid${plus}`}
            value={inr(money.paid_with_gst ?? money.paid)}
            sub={`Without GST: ${inr(money.paid)}`}
            icon={<Wallet className="h-4 w-4" />}
          />
          <StatCard
            tone={isPositive(money.pending) ? "amber" : "slate"}
            label={`Pending${plus}`}
            value={inr(money.pending_with_gst ?? money.pending)}
            sub={isPositive(money.pending) ? `Without GST: ${inr(money.pending)}` : "nothing pending"}
            icon={<Hourglass className="h-4 w-4" />}
          />
        </>
      ) : (
        Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)
      )}
      {payoutRate ? (
        <StatCard
          tone="sky"
          label="Payout rate"
          value={payoutRate}
          sub={rate?.payout_rate_varies ? "average · on money the bank releases" : "on money the bank releases"}
          icon={<Percent className="h-4 w-4" />}
        />
      ) : !rate ? (
        <KpiCardSkeleton />
      ) : null}
    </div>
  );
}

// Admitverse (no loans or payouts): lead outcomes.
function LeadTiles({ o }: { o: OverviewResponse }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      <StatCard
        tone="navy"
        label="Delivered"
        value={int(o.funnel.delivered)}
        sub="leads sent"
        icon={<Inbox className="h-4 w-4" />}
      />
      <StatCard
        tone="teal"
        label="Valid %"
        value={pct(ratio(o.quality.valid, o.quality.delivered), 0)}
        sub={`${int(o.quality.valid)} of ${int(o.quality.delivered)} valid`}
        icon={<ShieldCheck className="h-4 w-4" />}
      />
      <StatCard
        tone="sky"
        label="Qualified"
        value={int(o.funnel.qualified)}
        sub={`${pct(o.rates.qualification_rate)} rate`}
        icon={<Users className="h-4 w-4" />}
      />
      <StatCard
        tone="emerald"
        label="Converted"
        value={int(o.funnel.converted)}
        sub={`${int(o.funnel.lost)} lost`}
        icon={<CheckCircle2 className="h-4 w-4" />}
      />
      <StatCard
        tone="blue"
        label="Conversion rate"
        value={pct(o.rates.conversion_rate)}
        sub={`contact ${pct(o.rates.contact_rate)}`}
        icon={<TrendingUp className="h-4 w-4" />}
      />
    </div>
  );
}
