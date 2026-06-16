"use client";

import { useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { useLeaderboard } from "@/lib/queries";
import { DateRangePicker } from "@/components/shell/date-range-picker";
import { GradeBadge } from "@/components/grade-badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableRowsSkeleton } from "@/components/skeletons";
import { EmptyState } from "@/components/empty-state";
import { defaultRange } from "@/lib/filters";
import { int, pct } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { LeaderboardRow } from "@/lib/types";

type SortKey = keyof Pick<
  LeaderboardRow,
  "provider_name" | "delivered" | "valid" | "qualified" | "converted" | "qualification_rate" | "conversion_rate" | "score_pct"
>;

const COLUMNS: { key: SortKey; label: string; numeric?: boolean; render: (r: LeaderboardRow) => React.ReactNode }[] = [
  { key: "provider_name", label: "Provider", render: (r) => <span className="font-medium">{r.provider_name}</span> },
  { key: "delivered", label: "Delivered", numeric: true, render: (r) => int(r.delivered) },
  { key: "valid", label: "Valid", numeric: true, render: (r) => int(r.valid) },
  { key: "qualified", label: "Qualified", numeric: true, render: (r) => int(r.qualified) },
  { key: "converted", label: "Converted", numeric: true, render: (r) => int(r.converted) },
  { key: "qualification_rate", label: "Qual. rate", numeric: true, render: (r) => pct(r.qualification_rate) },
  { key: "conversion_rate", label: "Conv. rate", numeric: true, render: (r) => pct(r.conversion_rate) },
  { key: "score_pct", label: "Score", numeric: true, render: (r) => pct(r.score_pct / 100, 0) },
];

export default function LeaderboardPage() {
  const [range, setRange] = useState(() => defaultRange(30));
  const [sortKey, setSortKey] = useState<SortKey>("score_pct");
  const [asc, setAsc] = useState(false);
  const { data, isLoading } = useLeaderboard(range);

  const sorted = [...(data ?? [])].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (typeof av === "string" && typeof bv === "string") {
      return asc ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    return asc ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  function toggleSort(key: SortKey) {
    if (key === sortKey) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
          <p className="text-sm text-muted-foreground">Provider performance ranked by score.</p>
        </div>
        <DateRangePicker from={range.from} to={range.to} onChange={setRange} />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              {COLUMNS.map((c) => (
                <TableHead key={c.key} className={cn(c.numeric && "text-right")}>
                  <button
                    type="button"
                    onClick={() => toggleSort(c.key)}
                    className={cn(
                      "inline-flex items-center gap-1 hover:text-foreground",
                      c.numeric && "flex-row-reverse",
                      sortKey === c.key && "text-foreground",
                    )}
                  >
                    {c.label}
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
              ))}
              <TableHead className="text-right">Grade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRowsSkeleton rows={6} cols={9} />
            ) : sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="p-0">
                  <EmptyState className="border-0" title="No data" description="No provider activity in this range." />
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((r) => (
                <TableRow key={r.provider_id}>
                  {COLUMNS.map((c) => (
                    <TableCell key={c.key} className={cn("tabular-nums", c.numeric && "text-right")}>
                      {c.render(r)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    <GradeBadge grade={r.grade} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
