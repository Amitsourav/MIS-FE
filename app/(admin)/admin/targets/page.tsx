"use client";

import { useMemo, useState } from "react";
import { Loader2, Info } from "lucide-react";
import { useTargets, useSaveTargets } from "@/lib/queries";
import { errorMessage } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BrandChip } from "@/components/stage-badge";
import { toast } from "@/components/ui/sonner";
import { QueryError } from "@/components/query-error";
import type { TargetOut } from "@/lib/types";

const GROUP_HELP: Record<string, string> = {
  weight: "Relative weight of each criterion in the overall score (company setting, not a benchmark).",
  band: "Acceptable / good thresholds used to rate a metric.",
  grade: "Score cutoffs that map to each letter grade.",
  other: "Other configurable company targets.",
};

function groupOf(metricKey: string) {
  const prefix = metricKey.split(".")[0];
  return ["weight", "band", "grade"].includes(prefix) ? prefix : "other";
}

function humanize(metricKey: string) {
  return metricKey.replace(/\./g, " · ").replace(/_/g, " ");
}

export default function TargetsPage() {
  const targets = useTargets();
  const { data, isLoading } = targets;
  const save = useSaveTargets();
  const [edits, setEdits] = useState<Record<string, number>>({});

  const grouped = useMemo(() => {
    const g: Record<string, TargetOut[]> = {};
    for (const t of data ?? []) {
      const key = groupOf(t.metric_key);
      (g[key] ??= []).push(t);
    }
    return g;
  }, [data]);

  function valueOf(t: TargetOut) {
    return edits[t.id] ?? t.target_value;
  }

  function onSave() {
    const targets = (data ?? []).map((t) => ({
      brand: t.brand,
      metric_key: t.metric_key,
      target_value: valueOf(t),
    }));
    save.mutate(targets, {
      onSuccess: () => {
        toast.success("Targets saved");
        setEdits({});
      },
      onError: (e) => toast.error(errorMessage(e)),
    });
  }

  const dirty = Object.keys(edits).length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Targets</h1>
          <p className="text-sm text-muted-foreground">
            Company scoring settings. These drive grades and color bands across the portal.
          </p>
        </div>
        <Button onClick={onSave} disabled={!dirty || save.isPending}>
          {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save
        </Button>
      </div>

      <p className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        To reset everything to defaults, re-run the backend seed. A target with no brand applies to
        all brands.
      </p>

      {targets.isError && !data ? (
        <QueryError error={targets.error} onRetry={() => void targets.refetch()} />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (data?.length ?? 0) === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No targets configured.
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([group, items]) => (
          <Card key={group}>
            <CardHeader>
              <CardTitle className="capitalize">{group}</CardTitle>
              <CardDescription>{GROUP_HELP[group]}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {items.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-4 rounded-md border p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{humanize(t.metric_key)}</p>
                    <div className="mt-0.5">
                      {t.brand ? (
                        <BrandChip brand={t.brand} />
                      ) : (
                        <span className="text-xs text-muted-foreground">All brands</span>
                      )}
                    </div>
                  </div>
                  <Input
                    type="number"
                    step="any"
                    className="w-32 text-right tabular-nums"
                    value={valueOf(t)}
                    onChange={(e) =>
                      setEdits((prev) => ({ ...prev, [t.id]: Number(e.target.value) }))
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
