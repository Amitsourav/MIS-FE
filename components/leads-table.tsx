"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StageBadge, BrandChip } from "@/components/stage-badge";
import { TableRowsSkeleton } from "@/components/skeletons";
import { EmptyState } from "@/components/empty-state";
import { date } from "@/lib/format";
import type { LeadOut } from "@/lib/types";

export function LeadsTable({
  leads,
  loading,
  emptyHint,
}: {
  leads: LeadOut[];
  loading: boolean;
  emptyHint?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">#</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Brand</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Flags</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRowsSkeleton rows={8} cols={8} />
          ) : leads.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="p-0">
                <EmptyState
                  className="border-0"
                  title="No leads found"
                  description={emptyHint ?? "No leads match the current filters."}
                />
              </TableCell>
            </TableRow>
          ) : (
            leads.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="tabular-nums text-muted-foreground">
                  {l.serial_no ?? "—"}
                </TableCell>
                <TableCell className="font-medium">{l.full_name ?? "—"}</TableCell>
                <TableCell className="tabular-nums">{l.phone ?? "—"}</TableCell>
                <TableCell>
                  <BrandChip brand={l.brand} />
                </TableCell>
                <TableCell className="max-w-[160px] truncate text-muted-foreground">
                  {l.source_name ?? "—"}
                </TableCell>
                <TableCell>
                  <StageBadge stage={l.canonical_stage} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {date(l.created_at)}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {l.is_invalid && (
                      <Badge variant="destructive" className="text-[10px]">
                        Invalid
                      </Badge>
                    )}
                    {l.is_duplicate && (
                      <Badge variant="secondary" className="text-[10px]">
                        Duplicate
                      </Badge>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
