"use client";

import { RefreshCw, Loader2, CheckCircle2, AlertCircle, MinusCircle } from "lucide-react";
import { useSyncStatus, useRunSync, useMe } from "@/lib/queries";
import { errorMessage } from "@/lib/api";
import { useAdminCompany, effectiveCompany } from "@/lib/admin-company";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";
import { BRAND_LABELS } from "@/lib/tokens";
import { dateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Brand, SyncStateOut } from "@/lib/types";

function StatusBadge({ status }: { status: string | null }) {
  const s = (status ?? "").toLowerCase();
  const map: Record<string, { cls: string; icon: React.ReactNode; label: string }> = {
    ok: { cls: "text-emerald-600", icon: <CheckCircle2 className="h-4 w-4" />, label: "OK" },
    skipped: { cls: "text-amber-600", icon: <MinusCircle className="h-4 w-4" />, label: "Skipped" },
    error: { cls: "text-destructive", icon: <AlertCircle className="h-4 w-4" />, label: "Error" },
  };
  const info = map[s] ?? {
    cls: "text-muted-foreground",
    icon: <MinusCircle className="h-4 w-4" />,
    label: status ?? "Never run",
  };
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm font-medium", info.cls)}>
      {info.icon}
      {info.label}
    </span>
  );
}

export default function SyncPage() {
  const { data: me } = useMe();
  const { company } = useAdminCompany();
  const scope = effectiveCompany(me?.brand, company);

  const status = useSyncStatus({ refetchInterval: false });
  const running = status.data?.running ?? false;
  // Poll while a sync is running.
  const live = useSyncStatus({ refetchInterval: running ? 5000 : false });
  const allStates = live.data?.states ?? status.data?.states ?? [];
  // Super-admins can scope to one company; company admins already get only theirs.
  const states = scope === "both" ? allStates : allStates.filter((s) => s.brand === scope);
  const isRunning = live.data?.running ?? running;
  const runSync = useRunSync();

  function run(brand?: Brand) {
    runSync.mutate(brand, {
      onSuccess: (res) => {
        toast.success(res.detail || `Sync triggered${brand ? ` for ${BRAND_LABELS[brand]}` : ""}`);
      },
      onError: (e) => toast.error(errorMessage(e)),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sync</h1>
          <p className="text-sm text-muted-foreground">Pull the latest leads from each CRM.</p>
        </div>
        <div className="flex items-center gap-3">
          {isRunning && (
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Running…
            </span>
          )}
          <Button
            onClick={() => run(scope === "both" ? undefined : scope)}
            disabled={isRunning || runSync.isPending}
          >
            <RefreshCw className={cn("h-4 w-4", (isRunning || runSync.isPending) && "animate-spin")} />
            {scope === "both" ? "Run all" : `Run ${BRAND_LABELS[scope]}`}
          </Button>
        </div>
      </div>

      {status.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {states.map((st: SyncStateOut) => (
            <Card key={st.brand}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>{BRAND_LABELS[st.brand] ?? st.brand}</CardTitle>
                <StatusBadge status={st.last_status} />
              </CardHeader>
              <CardContent className="space-y-3">
                <dl className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Last run</dt>
                    <dd>{dateTime(st.last_run_at)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Watermark</dt>
                    <dd className="truncate">{st.last_watermark ?? "—"}</dd>
                  </div>
                </dl>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => run(st.brand)}
                  disabled={isRunning || runSync.isPending}
                >
                  <RefreshCw className="h-4 w-4" />
                  Run {BRAND_LABELS[st.brand] ?? st.brand}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
