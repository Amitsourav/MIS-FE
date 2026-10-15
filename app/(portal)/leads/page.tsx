"use client";

import { useEffect, useState } from "react";
import { Search, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { useUrlFilters } from "@/lib/use-filters";
import { useLeads, useStages } from "@/lib/queries";
import { leadsQuery } from "@/lib/filters";
import { LeadsTable } from "@/components/leads-table";
import { QueryError } from "@/components/query-error";
import { useLastGood } from "@/lib/use-last-good";
import { useStageTones } from "@/lib/stage-colors";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { int } from "@/lib/format";

// Radix Select can't use "" as an item value, so "all stages" gets a sentinel.
const ALL_STAGES = "__all__";

export default function LeadsPage() {
  const { filters, setFilters } = useUrlFilters();
  const leads = useLeads(filters);
  const { data, error } = useLastGood(leads);
  const { tone, learn } = useStageTones(filters);
  useEffect(() => {
    if (data) learn(data.items);
  }, [data, learn]);
  // CRM stages (in CRM order) for the current date/brand scope.
  const stages = useStages(filters);
  const stageOptions = stages.data ?? [];
  const selectedStage = filters.crmStage ?? "";
  // A stage picked earlier may have no leads in a new date range; keep it selectable.
  const selectedMissing =
    !!selectedStage && !!stages.data && !stageOptions.some((s) => s.value === selectedStage);

  // Debounced search synced to the URL.
  const [search, setSearch] = useState(filters.q ?? "");
  useEffect(() => {
    const t = setTimeout(() => {
      if ((filters.q ?? "") !== search) setFilters({ q: search || undefined });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const total = data?.total ?? 0;
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 50;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  function exportCsv() {
    const qs = new URLSearchParams(leadsQuery(filters)).toString();
    window.location.href = `/api/me/leads/export?${qs}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">Leads</h1>
          <p className="text-sm text-muted-foreground">
            Every lead you&apos;ve sent us, with where it stands today.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={total === 0}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Name, phone or lead no."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select
          value={selectedStage || ALL_STAGES}
          onValueChange={(v) =>
            // `stage` is the old canonical filter param; drop it from older bookmarks.
            setFilters({ crm_stage: v === ALL_STAGES ? undefined : v, stage: undefined })
          }
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="All stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STAGES}>All stages</SelectItem>
            {stageOptions.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                <span className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", tone(s.value).dot)} />
                  {s.label} ({int(s.count)})
                </span>
              </SelectItem>
            ))}
            {selectedMissing && (
              <SelectItem value={selectedStage}>{selectedStage} (0)</SelectItem>
            )}
            {stages.isLoading && (
              <SelectItem value="__loading__" disabled>
                Loading stages…
              </SelectItem>
            )}
            {stages.isError && !stages.data && (
              <SelectItem value="__error__" disabled>
                Couldn&apos;t load stages
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <QueryError error={error} onRetry={() => void leads.refetch()} />
      ) : (
        <LeadsTable
          leads={data?.items ?? []}
          loading={!data}
          emptyHint="Try a wider date range, another stage, or clear the search."
          stageTone={(l) => tone(l.crm_stage, l.canonical_stage)}
        />
      )}

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {total === 0 ? "No results" : `${int(start)}–${int(end)} of ${int(total)}`}
          {leads.isFetching && total > 0 && <span className="ml-2 opacity-60">updating…</span>}
        </p>
        <div className="flex items-center gap-3">
          <Select
            value={String(pageSize)}
            onValueChange={(v) => setFilters({ page_size: v, page: 1 })}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[25, 50, 100].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} / page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              disabled={page <= 1}
              onClick={() => setFilters({ page: page - 1 })}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 text-sm tabular-nums">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={page >= totalPages}
              onClick={() => setFilters({ page: page + 1 })}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
