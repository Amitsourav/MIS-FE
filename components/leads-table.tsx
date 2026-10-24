"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TableRowsSkeleton } from "@/components/skeletons";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";
import { avatarFor, initials } from "@/lib/avatar";
import type { StageTone } from "@/lib/stage-colors";
import { date, inr } from "@/lib/format";
import { NEW_TAB, leadHref, openLeadRow } from "@/lib/lead-nav";
import type { LeadLender, LeadLenderStatus, LeadOut } from "@/lib/types";

const COLS = 8;

// Bank-stage badge colours; the lead page uses them too.
export const LENDER_STATUS_CLASSES: Record<LeadLenderStatus, string> = {
  disbursed: "bg-emerald-100 text-emerald-700",
  pf_paid: "bg-blue-100 text-blue-700",
  sanctioned: "bg-blue-100 text-blue-700",
  loan_login: "bg-slate-100 text-slate-700",
  lost: "bg-red-50 text-red-600",
};

function LenderLine({ lender, className }: { lender: LeadLender; className?: string }) {
  const amount = lender.amount
    ? `${inr(lender.amount)}${lender.amount_kind === "applied" ? " (applied)" : ""}`
    : null;
  const detail = [amount, lender.application_no && `App no. ${lender.application_no}`]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <span className="font-medium">{lender.bank ?? "—"}</span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
            LENDER_STATUS_CLASSES[lender.status] ?? LENDER_STATUS_CLASSES.loan_login,
          )}
        >
          {lender.status_label}
        </span>
      </div>
      {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
}

// Lenders arrive furthest-along first. On mobile only the first shows, with a toggle.
function LenderCell({ lenders }: { lenders: LeadLender[] }) {
  const [expanded, setExpanded] = useState(false);
  if (lenders.length === 0) return <span className="text-muted-foreground">—</span>;
  const more = lenders.length - 1;
  return (
    <div className="space-y-1.5">
      {lenders.map((l, i) => (
        <LenderLine
          key={`${l.bank ?? "na"}-${l.application_no ?? i}`}
          lender={l}
          className={i > 0 && !expanded ? "hidden sm:block" : undefined}
        />
      ))}
      {more > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation(); // don't open the lead
            setExpanded((v) => !v);
          }}
          className="text-xs font-medium text-primary underline-offset-2 hover:underline sm:hidden"
        >
          {expanded ? "Show less" : `+${more} more`}
        </button>
      )}
    </div>
  );
}

export function LeadsTable({
  leads,
  loading,
  emptyHint,
  stageTone,
  unreadIds,
}: {
  leads: LeadOut[];
  loading: boolean;
  emptyHint?: React.ReactNode;
  stageTone: (lead: LeadOut) => StageTone;
  unreadIds?: Set<string>; // leads with a staff chat reply the partner hasn't opened
}) {
  // The whole row opens the lead, always in a new tab. The name is a real link.

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20 whitespace-nowrap">Lead no.</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Counsellor</TableHead>
            <TableHead>Lender</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Flags</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRowsSkeleton rows={8} cols={COLS} />
          ) : leads.length === 0 ? (
            <TableRow>
              <TableCell colSpan={COLS} className="p-0">
                <EmptyState
                  className="border-0"
                  title="No leads found"
                  description={emptyHint ?? "No leads match the current filters."}
                />
              </TableCell>
            </TableRow>
          ) : (
            leads.map((l) => (
              <TableRow
                key={l.id}
                className="cursor-pointer even:bg-slate-50/40 hover:bg-blue-50/50"
                onClick={(e) => openLeadRow(e, l.id)}
                onAuxClick={(e) => e.button === 1 && openLeadRow(e, l.id)}
              >
                <TableCell className="font-semibold tabular-nums text-primary">
                  {l.lead_no != null ? `#${l.lead_no}` : "—"}
                </TableCell>
                <TableCell>
                  <Link
                    href={leadHref(l.id)}
                    {...NEW_TAB}
                    className="group flex items-center gap-2.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {l.full_name ? (
                      <>
                        <span
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                            avatarFor(l.full_name),
                          )}
                        >
                          {initials(l.full_name)}
                        </span>
                        <span className="font-medium text-slate-900 group-hover:text-primary group-hover:underline">
                          {l.full_name}
                        </span>
                      </>
                    ) : (
                      <span className="text-primary underline-offset-2 group-hover:underline">
                        View lead
                      </span>
                    )}
                    {unreadIds?.has(l.id) && (
                      <span
                        className="inline-flex shrink-0 items-center gap-1 text-blue-600"
                        title="New reply"
                      >
                        <span className="h-2 w-2 rounded-full bg-blue-600" />
                        <MessageCircle className="h-3.5 w-3.5" />
                        <span className="sr-only">New reply</span>
                      </span>
                    )}
                  </Link>
                </TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">{l.phone ?? "—"}</TableCell>
                {/* The CRM's own stage name; canonical_stage is only for charts. */}
                <TableCell className="whitespace-nowrap">
                  {l.crm_stage_label ? (
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1",
                        stageTone(l).pill,
                      )}
                    >
                      {l.crm_stage_label}
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap">{l.counsellor_name ?? "—"}</TableCell>
                <TableCell className="min-w-[200px]">
                  <LenderCell lenders={l.lenders ?? []} />
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
