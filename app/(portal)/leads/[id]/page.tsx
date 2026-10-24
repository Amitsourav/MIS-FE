"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { ArrowLeft, Building2, MessageCircle, Route, X } from "lucide-react";
import { useLeadDetail, useMessagesLatest } from "@/lib/queries";
import { useStageTones, type StageTone } from "@/lib/stage-colors";
import { parseFilters } from "@/lib/filters";
import { statusOf } from "@/lib/api";
import { clearOpenedFromList, wasOpenedFromList } from "@/lib/lead-nav";
import { avatarFor, initials } from "@/lib/avatar";
import { date, inr, isNegative, signedInr, timeOnly } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LENDER_STATUS_CLASSES } from "@/components/leads-table";
import { LeadChat } from "@/components/lead-chat";
import { QueryError } from "@/components/query-error";
import { EmptyState } from "@/components/empty-state";
import { PanelSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CanonicalStage, LeadDetail, LeadLender, PayoutItem } from "@/lib/types";

// Stage colours come from the all-time CRM stage list, same as the Leads table.
const ALL_TIME = parseFilters(new URLSearchParams());

type ToneFn = (crmStage: string | null | undefined, canonical?: CanonicalStage) => StageTone;

/** Local date + time with the year, e.g. "12 Mar 2026, 04:15 pm". */
function dateAndTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return `${date(iso)}, ${timeOnly(iso)}`;
}

function amountText(l: LeadLender | undefined): string {
  if (!l?.amount) return "—";
  return `${inr(l.amount)}${l.amount_kind === "applied" ? " (applied)" : ""}`;
}

/** lg and up: chat in a sticky right column. Below: behind a floating button. */
function useIsDesktop(): boolean | undefined {
  const [desktop, setDesktop] = useState<boolean>();
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return desktop;
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

  // A chat 404 also means "not this partner's lead": show the same not-found page.
  const [chatNotFound, setChatNotFound] = useState(false);
  const onChatNotFound = useCallback(() => setChatNotFound(true), []);
  useEffect(() => setChatNotFound(false), [id]);

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

  if (chatNotFound || statusOf(error) === 404) {
    return (
      <div className="space-y-4">
        {back}
        <EmptyState
          title="Lead not found"
          description="This lead isn't in your account, or it no longer exists."
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        {back}
        <QueryError error={error} onRetry={() => void query.refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {back}
      {lead ? (
        <LeadLayout lead={lead} tone={tone} onChatNotFound={onChatNotFound} />
      ) : (
        <LeadSkeleton />
      )}
    </div>
  );
}

function LeadLayout({
  lead,
  tone,
  onChatNotFound,
}: {
  lead: LeadDetail;
  tone: ToneFn;
  onChatNotFound: () => void;
}) {
  const desktop = useIsDesktop();
  const [sheetOpen, setSheetOpen] = useState(false);
  const latest = useMessagesLatest();
  const unread = latest.data?.some((m) => m.lead_id === lead.id && m.unread) ?? false;

  const chat = (className?: string) => (
    <LeadChat
      leadId={lead.id}
      counsellorName={lead.counsellor_name}
      onNotFound={onChatNotFound}
      className={className}
    />
  );

  return (
    <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
      <div className="min-w-0 space-y-4 lg:col-span-2">
        <Summary lead={lead} tone={tone} />
        <Journey lead={lead} tone={tone} />
        <LenderDetails lead={lead} />
      </div>

      {/* Desktop: sticky, full-height chat column. Mounted only where it's seen, since
          opening the thread marks replies read. */}
      {desktop && (
        <aside className="sticky top-20 h-[calc(100vh-6.5rem)] min-h-[28rem]">{chat("h-full")}</aside>
      )}

      {desktop === false && (
        <SheetPrimitive.Root open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetPrimitive.Trigger asChild>
            <Button className="fixed bottom-5 right-5 z-40 h-12 rounded-full px-5 shadow-lg">
              <MessageCircle className="h-5 w-5" />
              Chat
              {unread && (
                <span className="absolute right-1 top-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white">
                  <span className="sr-only">New reply</span>
                </span>
              )}
            </Button>
          </SheetPrimitive.Trigger>
          <SheetPrimitive.Portal>
            <SheetPrimitive.Content
              className="fixed inset-0 z-50 flex flex-col bg-background"
              aria-describedby={undefined}
            >
              <div className="flex items-center justify-between border-b px-4 py-2">
                <SheetPrimitive.Title className="text-sm font-semibold">
                  {lead.full_name ?? "Lead"} — chat
                </SheetPrimitive.Title>
                <SheetPrimitive.Close asChild>
                  <Button variant="ghost" size="icon" aria-label="Close chat">
                    <X className="h-5 w-5" />
                  </Button>
                </SheetPrimitive.Close>
              </div>
              {chat("flex-1 rounded-none border-0 shadow-none")}
            </SheetPrimitive.Content>
          </SheetPrimitive.Portal>
        </SheetPrimitive.Root>
      )}
      {/* Room for the floating button under the last card. */}
      {desktop === false && <div className="h-16" aria-hidden />}
    </div>
  );
}

function Summary({ lead, tone }: { lead: LeadDetail; tone: ToneFn }) {
  const first = lead.lenders[0]; // the API sends the furthest-along lender first
  return (
    <Card className="overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-slate-900 via-blue-800 to-teal-500" />
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <span
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-semibold",
              lead.full_name ? avatarFor(lead.full_name) : "bg-slate-100 text-slate-600",
            )}
          >
            {lead.full_name ? initials(lead.full_name) : "?"}
          </span>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              {lead.lead_no != null && (
                <>
                  <span className="text-lg font-semibold tabular-nums text-primary">#{lead.lead_no}</span>
                  <span className="text-muted-foreground">·</span>
                </>
              )}
              <h1 className="break-words text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                {lead.full_name ?? "Unnamed lead"}
              </h1>
              {lead.is_invalid && (
                <span className="self-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                  Invalid
                </span>
              )}
              {lead.is_duplicate && (
                <span className="self-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                  Duplicate
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Received {dateAndTime(lead.created_at)}</p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <Field label="Phone">
            <span className="tabular-nums">{lead.phone ?? "—"}</span>
          </Field>
          <Field label="Stage">
            {lead.crm_stage_label ? (
              <span
                className={cn(
                  "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1",
                  tone(lead.crm_stage, lead.canonical_stage).pill,
                )}
              >
                {lead.crm_stage_label}
              </span>
            ) : (
              "—"
            )}
          </Field>
          <Field label="Counsellor">
            {lead.counsellor_name ?? <span className="text-muted-foreground">Not assigned yet</span>}
          </Field>
          <Field label="Lender">{first?.bank ?? "—"}</Field>
          <Field label="Amount">
            <span className="tabular-nums">{amountText(first)}</span>
          </Field>
          <Field label="Bank stage">{first ? <BankStage lender={first} /> : "—"}</Field>
        </dl>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-slate-900">{children}</dd>
    </div>
  );
}

function BankStage({ lender }: { lender: LeadLender }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
        LENDER_STATUS_CLASSES[lender.status] ?? LENDER_STATUS_CLASSES.loan_login,
      )}
    >
      {lender.status_label}
    </span>
  );
}

function SectionCard({
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

function Journey({ lead, tone }: { lead: LeadDetail; tone: ToneFn }) {
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
    <SectionCard icon={<Route className="h-4 w-4" />} iconClass="bg-teal-100 text-teal-700" title="Journey">
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
    </SectionCard>
  );
}

function LenderDetails({ lead }: { lead: LeadDetail }) {
  // Each payout goes under the lender with the same bank; any that match none
  // (e.g. the bank isn't known yet) are listed at the end so nothing is dropped.
  const banks = new Set(lead.lenders.map((l) => l.bank).filter(Boolean));
  const unmatched = lead.payouts.filter((p) => !p.bank_name || !banks.has(p.bank_name));

  return (
    <SectionCard icon={<Building2 className="h-4 w-4" />} iconClass="bg-blue-100 text-blue-700" title="Lender details">
      {lead.lenders.length === 0 ? (
        <p className="text-sm text-muted-foreground">Not logged in with a lender yet</p>
      ) : (
        <div className="space-y-3">
          {lead.lenders.map((l, i) => (
            <LenderBlock
              key={`${l.bank ?? "na"}-${l.application_no ?? i}`}
              lender={l}
              payouts={l.bank ? lead.payouts.filter((p) => p.bank_name === l.bank) : []}
            />
          ))}
        </div>
      )}
      {unmatched.length > 0 && (
        <div className="mt-3 space-y-2">
          {unmatched.map((p, i) => (
            <PayoutLine key={i} item={p} withBank />
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function LenderBlock({ lender, payouts }: { lender: LeadLender; payouts: PayoutItem[] }) {
  return (
    <div className="rounded-lg border p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-slate-900">{lender.bank ?? "—"}</p>
        <BankStage lender={lender} />
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <div className="min-w-0">
          <dt className="text-xs text-muted-foreground">Application no.</dt>
          <dd className="break-all font-medium">{lender.application_no ?? "—"}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-muted-foreground">Amount</dt>
          <dd className="font-medium tabular-nums">{amountText(lender)}</dd>
        </div>
      </dl>

      <div className="mt-3">
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Tranches</p>
        {lender.tranches.length === 0 ? (
          <p className="text-sm text-muted-foreground">No money released yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-1.5 pr-3 font-medium">Tranche no.</th>
                <th className="py-1.5 pr-3 text-right font-medium">Amount</th>
                <th className="py-1.5 text-right font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {lender.tranches.map((t, i) => (
                <tr key={`${t.tranche_no ?? "na"}-${i}`} className="border-b last:border-0">
                  <td className="py-1.5 pr-3 tabular-nums">{t.tranche_no ?? "—"}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{inr(t.amount)}</td>
                  <td className="whitespace-nowrap py-1.5 text-right text-muted-foreground">
                    {date(t.disbursed_on)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {payouts.map((p, i) => (
        <PayoutLine key={i} item={p} className="mt-3" />
      ))}
    </div>
  );
}

function PayoutLine({
  item,
  withBank = false,
  className,
}: {
  item: PayoutItem;
  withBank?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md bg-emerald-50 px-3 py-2 text-sm ring-1 ring-emerald-100",
        className,
      )}
    >
      <span className="font-semibold text-emerald-800">
        Your payout (without GST){withBank && item.bank_name ? ` · ${item.bank_name}` : ""}
      </span>
      <span>
        <span className="text-muted-foreground">Earned </span>
        <span className="font-medium tabular-nums">{inr(item.earned)}</span>
      </span>
      <span>
        <span className="text-muted-foreground">Paid </span>
        <span className="font-medium tabular-nums">{inr(item.paid)}</span>
      </span>
      <span>
        <span className="text-muted-foreground">Balance </span>
        <span className={cn("font-medium tabular-nums", isNegative(item.balance) && "text-red-600")}>
          {signedInr(item.balance)}
        </span>
      </span>
    </div>
  );
}

function LeadSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card>
          <CardContent className="space-y-5 p-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-7 w-56 max-w-full" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
        <PanelSkeleton rows={4} />
        <PanelSkeleton rows={3} />
      </div>
      <Skeleton className="hidden h-[28rem] rounded-xl lg:block" />
    </div>
  );
}
