"use client";

import { useState } from "react";
import { Inbox, Users, CheckCircle2, TrendingUp, ShieldCheck, Trophy } from "lucide-react";
import { useUrlFilters } from "@/lib/use-filters";
import { useOverview, useTrends, useBrandSplit, useQuality } from "@/lib/queries";
import { KpiCard, KpiCardSkeleton } from "@/components/kpi-card";
import { GradeBadge } from "@/components/grade-badge";
import { FunnelChart } from "@/components/charts/funnel-chart";
import { TrendChart } from "@/components/charts/trend-chart";
import { BrandSplitChart } from "@/components/charts/brand-split-chart";
import { QualityPanel } from "@/components/charts/quality-panel";
import { ScorecardPanel } from "@/components/scorecard-panel";
import { EmptyState } from "@/components/empty-state";
import { ChartSkeleton, PanelSkeleton } from "@/components/skeletons";
import { Card, CardContent } from "@/components/ui/card";
import { int, pct, ratio } from "@/lib/format";

export default function DashboardPage() {
  const { filters } = useUrlFilters();
  const [granularity, setGranularity] = useState<"day" | "week">("day");

  const overview = useOverview(filters);
  const trends = useTrends(filters, granularity);
  const brandSplit = useBrandSplit(filters);
  const quality = useQuality(filters);

  const o = overview.data;
  const showBrandSplit = (brandSplit.data?.rows.length ?? 0) > 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Performance of the leads you supplied across both CRMs.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        {overview.isLoading || !o ? (
          Array.from({ length: 6 }).map((_, i) => <KpiCardSkeleton key={i} />)
        ) : (
          <>
            <KpiCard
              label="Delivered"
              value={int(o.funnel.delivered)}
              sub={`${int(o.quality.valid)} valid`}
              icon={<Inbox className="h-4 w-4" />}
            />
            <KpiCard
              label="Valid %"
              value={pct(ratio(o.quality.valid, o.quality.delivered), 0)}
              sub={`${int(o.quality.invalid)} invalid · ${int(o.quality.duplicates)} dup`}
              icon={<ShieldCheck className="h-4 w-4" />}
            />
            <KpiCard
              label="Qualified"
              value={int(o.funnel.qualified)}
              sub={`${pct(o.rates.qualification_rate)} rate`}
              icon={<Users className="h-4 w-4" />}
            />
            <KpiCard
              label="Converted"
              value={int(o.funnel.converted)}
              sub={`${int(o.funnel.lost)} lost`}
              icon={<CheckCircle2 className="h-4 w-4" />}
            />
            <KpiCard
              label="Conversion Rate"
              value={pct(o.rates.conversion_rate)}
              sub={`contact ${pct(o.rates.contact_rate)}`}
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <KpiCard
              label="Scorecard"
              value={o.scorecard ? pct(o.scorecard.score_pct / 100, 0) : "—"}
              sub="overall grade"
              icon={<Trophy className="h-4 w-4" />}
            >
              {o.scorecard && (
                <div className="mt-2">
                  <GradeBadge grade={o.scorecard.grade} />
                </div>
              )}
            </KpiCard>
          </>
        )}
      </div>

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
          {/* Funnel + Trend */}
          <div className="grid gap-6 lg:grid-cols-2">
            {overview.isLoading || !o ? (
              <ChartSkeleton />
            ) : (
              <FunnelChart funnel={o.funnel} />
            )}
            {trends.isLoading || !trends.data ? (
              <ChartSkeleton />
            ) : (
              <TrendChart
                points={trends.data.points}
                granularity={granularity}
                onGranularityChange={setGranularity}
              />
            )}
          </div>

          {/* Brand split (only when provider has both brands) */}
          {brandSplit.isLoading ? (
            <ChartSkeleton />
          ) : (
            showBrandSplit && <BrandSplitChart rows={brandSplit.data!.rows} />
          )}

          {/* Quality + Scorecard */}
          <div className="grid gap-6 lg:grid-cols-2">
            {quality.isLoading || !quality.data ? (
              <PanelSkeleton />
            ) : (
              <QualityPanel quality={quality.data} />
            )}
            {overview.isLoading || !o ? (
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
    </div>
  );
}
