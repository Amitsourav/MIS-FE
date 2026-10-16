"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Building2, Clock, Phone, Route, UserRound, Wallet } from "lucide-react";
import { useLeadDetail } from "@/lib/queries";
import { useStageTones, type StageTone } from "@/lib/stage-colors";
import { parseFilters } from "@/lib/filters";
import { statusOf } from "@/lib/api";
import { clearOpenedFromList, wasOpenedFromList } from "@/lib/lead-nav";
import { avatarFor, initials } from "@/lib/avatar";
import { date, inr, isNegative, signedInr, timeOnly } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LenderLine } from "@/components/leads-table";
import { InvoiceCell } from "@/components/payouts/payout-table";
import { QueryError } from "@/components/query-error";
import { EmptyState } from "@/components/empty-state";
import { PanelSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { LeadDetail, PayoutItem } from "@/lib/types";

// Stage colours come from the all-time CRM stage list, same as the Leads table.
const ALL_TIME = parseFilters(new URLSearchParams());

/** Local date + time with the year, e.g. "12 Mar 2026, 04:15 pm". */
function dateAndTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return `${date(iso)}, ${timeOnly(iso)}`;
}

export default function LeadPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const query = useLeadDetail(id);
  // Not useLastGood: its memory spans ids, and must never show one lead on another's
  // URL. React Query already keeps this lead's data if a background refresh fails.
  const lead = query.data;
  const error = lead ? null : query.error;
  const { tone, learn } = useStageTones(ALL_TIME);
  useEffect(() => {
    if (lead) learn([lead]);
  }, [lead, learn]);

  // Opened from the Leads list in this tab → go back to the same filters and page.
  const [fromList] = useState(wasOpenedFromList);
  useEffect(() => clearOpenedFromList(), []);

  const back = (
    <Button variant="ghost" size="sm" className="-ml-2" asChild>
      <Link
        href="/leads"
        onClick={(e) => {
          if (!fromList || e.metaKey || e.ctrlKey || e.shiftKey) return;
          e.preventDefault();
          router.back();
        }}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to leads
      </Link>
    </Button>
  );

  if (error) {
    const notFound = statusOf(error) === 404;
    return (
      <div className="space-y-4">
        {back}
        {notFound ? (
          <EmptyState
            title="Lead not found"
            description="This lead isn't in your account, or it no longer exists."
          />
        ) : (
          <QueryError error={error} onRetry={() => void query.refetch()} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {back}
      {lead ? <LeadView lead={lead} tone={tone} /> : <LeadSkeleton />}
    </div>
  );
}

function LeadView({
  lead,
  tone,
}: {
  lead: LeadDetail;
  tone: (crmStage: string | null | undefined, canonical?: LeadDetail["canonical_stage"]) => StageTone;
}) {
  const stageTone = tone(lead.crm_stage, lead.canonical_stage);
  return (
    <>
      {/* Header */}
      <Card className="overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-slate-900 via-blue-800 to-teal-500" />
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
          <span
            className={cn(
              "flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-semibold",
              lead.full_name ? avatarFor(lead.full_name) : "bg-slate-100 text-slate-600",
            )}
          >
            {lead.full_name ? initials(lead.full_name) : "?"}
          </span>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              {lead.lead_no != null && (
                <span className="text-lg font-semibold tabular-nums text-primary">#{lead.lead_no}</span>
              )}
              <h1 className="break-words text-2xl font-bold tracking-tight text-slate-900">
                {lead.full_name ?? "Unnamed lead"}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {lead.phone && (
                <span className="inline-flex items-center gap-1.5 tabular-nums text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  {lead.phone}
                </span>
              )}
              {lead.crm_stage_label && (
                <span
                  className={cn(
                    "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1",
                    stageTone.pill,
                  )}
                >
                  {lead.crm_stage_label}
                </span>
              )}
              {lead.is_invalid && (
                <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                  Invalid
                </span>
              )}
              {lead.is_duplicate && (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                  Duplicate
                </span>
              )}
            </div>
            <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Lead received {dateAndTime(lead.created_at)}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Section icon={<UserRound className="h-4 w-4" />} iconClass="bg-sky-100 text-sky-700" title="Counsellor">
          {lead.counsellor_name ? (
            <p className="font-medium">{lead.counsellor_name}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Not assigned yet</p>
          )}
        </Section>

        <Section icon={<Building2 className="h-4 w-4" />} iconClass="bg-blue-100 text-blue-700" title="Lenders">
          {lead.lenders.length === 0 ? (
            <p className="text-sm text-muted-foreground">Not logged in with a lender yet</p>
          ) : (
            <div className="divide-y">
              {lead.lenders.map((l, i) => (
                <LenderLine
                  key={`${l.bank ?? "na"}-${l.application_no ?? i}`}
                  lender={l}
                  className="break-words py-2.5 first:pt-0 last:pb-0"
                />
              ))}
            </div>
          )}
        </Section>

        <Section icon={<Route className="h-4 w-4" />} iconClass="bg-teal-100 text-teal-700" title="Journey">
          <Journey lead={lead} tone={tone} />
        </Section>

        {/* Admitverse, or no payout yet: no card at all. */}
        {lead.payouts.length > 0 && (
          <Section icon={<Wallet className="h-4 w-4" />} iconClass="bg-emerald-100 text-emerald-700" title="Payout">
            <div className="space-y-3">
              {lead.payouts.map((p, i) => (
                <PayoutBlock key={`${p.bank_name ?? "na"}-${i}`} item={p} />
              ))}
            </div>
          </Section>
        )}
      </div>
    </>
  );
}

function Section({
  icon,
  iconClass,
  title,
  children,
}: {
  icon: React.ReactNode;
  iconClass: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader className="flex-row items-center gap-2.5 space-y-0 pb-3">
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", iconClass)}>{icon}</span>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

interface JourneyRow {
  key: string;
  label: string;
  at: string | null;
  dot: string;
  now: boolean;
}

function Journey({
  lead,
  tone,
}: {
  lead: LeadDetail;
  tone: (crmStage: string | null | undefined, canonical?: LeadDetail["canonical_stage"]) => StageTone;
}) {
  const history = lead.stage_history;
  const last = history.length - 1;
  // No history recorded: just "Received" and where the lead is now.
  const rows: JourneyRow[] =
    history.length > 0
      ? history.map((ev, i) => ({
          key: `${ev.stage}-${ev.at}-${i}`,
          label: ev.label,
          at: ev.at,
          dot: tone(ev.stage).dot,
          now: i === last && ev.stage === lead.crm_stage,
        }))
      : [
          { key: "received", label: "Received", at: lead.created_at, dot: "bg-slate-400", now: false },
          ...(lead.crm_stage_label
            ? [
                {
                  key: "current",
                  label: lead.crm_stage_label,
                  at: null,
                  dot: tone(lead.crm_stage, lead.canonical_stage).dot,
                  now: true,
                },
              ]
            : []),
        ];

  return (
    <ol className="relative">
      {rows.map((r, i) => (
        <li key={r.key} className="relative flex gap-3 pb-4 last:pb-0">
          {i < rows.length - 1 && (
            <span className="absolute left-[5px] top-4 h-[calc(100%-0.5rem)] w-px bg-border" aria-hidden />
          )}
          <span
            className={cn(
              "relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full ring-2 ring-background",
              r.dot,
              r.now && "ring-4 ring-blue-100",
            )}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("text-sm", r.now ? "font-semibold text-slate-900" : "font-medium")}>
                {r.label}
              </span>
              {r.now && (
                <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                  Now
                </span>
              )}
            </div>
            {r.at && <p className="text-xs text-muted-foreground">{dateAndTime(r.at)}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

function PayoutBlock({ item }: { item: PayoutItem }) {
  return (
    <div className="rounded-lg border bg-slate-50/60 p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-medium">{item.bank_name ?? "—"}</p>
        <InvoiceCell row={item} />
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
        <Money label="Earned" value={inr(item.earned)} />
        <Money label="Paid" value={inr(item.paid)} />
        <Money
          label="Balance"
          value={signedInr(item.balance)}
          className={isNegative(item.balance) ? "text-red-600" : undefined}
        />
      </dl>
      <p className="mt-2 text-xs text-muted-foreground">Last released on {date(item.last_disbursed_on)}</p>
    </div>
  );
}

function Money({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("truncate font-semibold tabular-nums", className)}>{value}</dd>
    </div>
  );
}

function LeadSkeleton() {
  return (
    <>
      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-72 max-w-full" />
            <Skeleton className="h-3 w-40" />
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <PanelSkeleton rows={1} />
        <PanelSkeleton rows={2} />
        <PanelSkeleton rows={4} />
        <PanelSkeleton rows={3} />
      </div>
    </>
  );
}
