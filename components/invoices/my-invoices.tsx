"use client";

import { Fragment, useState } from "react";
import { ChevronDown, Download, Receipt } from "lucide-react";
import { useInvoices, invoicePdfUrl } from "@/lib/queries";
import { date, inr, isPositive } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { QueryError } from "@/components/query-error";
import { SectionTitle } from "@/components/payouts/stat-card";
import type { Invoice } from "@/lib/types";

const MONEY = "text-right tabular-nums whitespace-nowrap";

/** The partner's invoices, newest first. Below the payout table; FundMyCampus only. */
export function MyInvoices() {
  const query = useInvoices();
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const invoices = query.data;

  return (
    <Card className="overflow-hidden rounded-xl">
      <div className="border-b px-5 py-4">
        <SectionTitle
          tone="navy"
          icon={<Receipt className="h-4 w-4" />}
          title="My invoices"
          description="Invoices you've raised to FundMyCampus, newest first."
        />
      </div>

      {!invoices ? (
        query.isError ? (
          <QueryError
            className="m-4"
            error={query.error}
            title="Couldn't load your invoices"
            onRetry={() => void query.refetch()}
          />
        ) : (
          <div className="space-y-2 p-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        )
      ) : invoices.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">
          No invoices yet. Raise one when you have payouts to bill.
        </p>
      ) : (
        <>
          {/* Desktop: table. */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-8" />
                  <TableHead>Invoice no.</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Students</TableHead>
                  <TableHead className="text-right">Payouts</TableHead>
                  <TableHead className="text-right">GST</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>PDF</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => {
                  const expanded = open.has(inv.id);
                  return (
                    <Fragment key={inv.id}>
                      <TableRow
                        className="cursor-pointer hover:bg-blue-50/40"
                        onClick={() => toggle(inv.id)}
                        aria-expanded={expanded}
                      >
                        <TableCell className="pr-0">
                          <ChevronDown
                            className={cn("h-4 w-4 text-muted-foreground transition-transform", expanded && "rotate-180")}
                          />
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{inv.invoice_number}</span>
                          {inv.raised_via === "crm" && <EnteredByFmc />}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{date(inv.invoice_date)}</TableCell>
                        <TableCell className="text-right tabular-nums">{inv.lines.length}</TableCell>
                        <TableCell className={MONEY}>{inr(inv.lines_total)}</TableCell>
                        <TableCell className={MONEY}>{inr(inv.gst_amount)}</TableCell>
                        <TableCell className={MONEY}>
                          <Total inv={inv} />
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <StatusBadge inv={inv} />
                        </TableCell>
                        <TableCell>
                          <PdfLink inv={inv} />
                        </TableCell>
                      </TableRow>
                      {expanded && (
                        <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                          <TableCell />
                          <TableCell colSpan={8} className="py-2">
                            <Lines inv={inv} />
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Phone: one card per invoice. */}
          <ul className="divide-y md:hidden">
            {invoices.map((inv) => {
              const expanded = open.has(inv.id);
              return (
                <li key={inv.id} className="px-4 py-3">
                  <button
                    type="button"
                    className="flex w-full items-start gap-3 text-left"
                    onClick={() => toggle(inv.id)}
                    aria-expanded={expanded}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{inv.invoice_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {date(inv.invoice_date)} · {inv.lines.length}{" "}
                        {inv.lines.length === 1 ? "student" : "students"}
                      </p>
                      {inv.raised_via === "crm" && <EnteredByFmc />}
                    </div>
                    <div className="shrink-0 text-right">
                      <Total inv={inv} />
                      <div className="mt-1">
                        <StatusBadge inv={inv} />
                      </div>
                    </div>
                  </button>
                  <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span className="tabular-nums">
                      Payouts {inr(inv.lines_total)} · GST {inr(inv.gst_amount)}
                    </span>
                    <PdfLink inv={inv} />
                  </div>
                  {expanded && (
                    <div className="mt-2 rounded-md bg-slate-50 px-3 py-2">
                      <Lines inv={inv} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Card>
  );
}

function EnteredByFmc() {
  return (
    <span className="mt-0.5 block text-[11px] font-medium text-muted-foreground">Entered by FundMyCampus</span>
  );
}

function Total({ inv }: { inv: Invoice }) {
  return (
    <>
      <span className={cn("font-semibold", inv.status === "cancelled" && "text-muted-foreground line-through")}>
        {inr(inv.amount)}
      </span>
      {isPositive(inv.tds_amount) && (
        <span className="block text-xs font-normal text-muted-foreground">
          TDS {inr(inv.tds_amount)} · Net {inr(inv.net_amount)}
        </span>
      )}
    </>
  );
}

function StatusBadge({ inv }: { inv: Invoice }) {
  if (inv.status === "paid") {
    return (
      <span className="inline-flex flex-col items-start">
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Paid</span>
        {inv.paid_on && <span className="mt-0.5 text-[11px] text-muted-foreground">on {date(inv.paid_on)}</span>}
      </span>
    );
  }
  if (inv.status === "cancelled") {
    return (
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">Cancelled</span>
    );
  }
  return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Raised</span>;
}

function PdfLink({ inv }: { inv: Invoice }) {
  if (!inv.has_pdf) return <span className="text-muted-foreground">—</span>;
  return (
    <a
      href={invoicePdfUrl(inv.id)}
      onClick={(e) => e.stopPropagation()} // don't toggle the row
      className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-2 hover:underline"
    >
      <Download className="h-3.5 w-3.5" />
      PDF
    </a>
  );
}

function Lines({ inv }: { inv: Invoice }) {
  if (inv.lines.length === 0) return <p className="text-xs text-muted-foreground">No students on this invoice.</p>;
  return (
    <ul className="space-y-1 text-sm">
      {inv.lines.map((l, i) => (
        <li key={`${l.lead_id ?? "na"}-${i}`} className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate">
            {l.lead_no != null && <span className="mr-1.5 font-semibold tabular-nums text-primary">#{l.lead_no}</span>}
            {l.full_name ?? "—"}
            <span className="text-muted-foreground"> · {l.bank_name ?? "—"}</span>
          </span>
          <span className="shrink-0 tabular-nums">{inr(l.amount)}</span>
        </li>
      ))}
    </ul>
  );
}
