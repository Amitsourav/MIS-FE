"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TableRowsSkeleton } from "@/components/skeletons";
import { cn } from "@/lib/utils";
import { avatarFor, initials } from "@/lib/avatar";
import { date, inr, isNegative, isPositive, ratePct, signedInr } from "@/lib/format";
import type { PayoutItem } from "@/lib/types";

// Unassigned payouts (admin) also carry FMC's serial no. and the CRM source name.
type Row = PayoutItem & { serial_no?: number | null; source_name?: string | null };

const MONEY = "text-right tabular-nums whitespace-nowrap";
const HEAD = "whitespace-nowrap";

const SUB = "block text-xs font-normal text-muted-foreground";

// One row per student × lender, in server order (last released, newest first).
// Headers are deliberately plain: there is no client-side sorting.
// `showSource` adds a CRM source column (admin "Unassigned payouts").
// TDS / Net paid only appear when some row on this page has TDS.
export function PayoutTable({
  items,
  loading,
  showSource = false,
  bare = false,
}: {
  items: Row[];
  loading: boolean;
  showSource?: boolean;
  bare?: boolean; // no own border: the parent card provides it
}) {
  const showTds = items.some((r) => isPositive(r.tds));
  const cols = 13 + (showSource ? 1 : 0) + (showTds ? 2 : 0);
  return (
    <div className={cn("bg-card", !bare && "overflow-hidden rounded-xl border shadow-sm")}>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={cn(HEAD, "w-16")}>#</TableHead>
            {showSource && <TableHead className={HEAD}>Source</TableHead>}
            <TableHead className={HEAD}>Student</TableHead>
            <TableHead className={HEAD}>Lender</TableHead>
            <TableHead className={cn(HEAD, "text-right")}>Loan amount</TableHead>
            <TableHead
              className={cn(HEAD, "whitespace-nowrap text-right")}
              title="What the bank has released so far. Your payout is your rate on this."
            >
              Disbursed so far
            </TableHead>
            <TableHead className={HEAD}>Rate</TableHead>
            <TableHead className={cn(HEAD, "text-right")}>Earned</TableHead>
            <TableHead className={cn(HEAD, "text-right")}>Paid</TableHead>
            {showTds && <TableHead className={cn(HEAD, "text-right")}>TDS</TableHead>}
            {showTds && <TableHead className={cn(HEAD, "whitespace-nowrap text-right")}>Net paid</TableHead>}
            <TableHead className={cn(HEAD, "text-right")}>Pending</TableHead>
            <TableHead
              className={cn(HEAD, "text-right")}
              title="Earned − paid. + still to be paid; − paid extra, adjusted on the next bill."
            >
              Balance
            </TableHead>
            <TableHead className={HEAD}>Invoice</TableHead>
            <TableHead className={cn(HEAD, "whitespace-nowrap")}>Last released on</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRowsSkeleton rows={6} cols={cols} />
          ) : (
            items.map((row, i) => (
              <TableRow
                key={`${row.lead_no ?? row.serial_no ?? "na"}-${row.bank_name ?? "na"}-${i}`}
                className="even:bg-slate-50/40 hover:bg-blue-50/40"
              >
                <TableCell className="tabular-nums text-muted-foreground">
                  {row.lead_no ?? row.serial_no ?? "—"}
                </TableCell>
                {showSource && (
                  <TableCell className="whitespace-nowrap">{row.source_name ?? "—"}</TableCell>
                )}
                <TableCell>
                  {row.full_name ? (
                    <div className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                          avatarFor(row.full_name),
                        )}
                      >
                        {initials(row.full_name)}
                      </span>
                      <span className="font-medium text-slate-900">{row.full_name}</span>
                    </div>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {row.bank_name ? (
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                      {row.bank_name}
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className={MONEY}>{inr(row.loan_amount)}</TableCell>
                <TableCell className={MONEY}>{inr(row.disbursed_total)}</TableCell>
                <TableCell>
                  {row.payout_basis === "agreed" ? (
                    <Badge className="border-transparent bg-slate-100 font-medium text-slate-700 hover:bg-slate-100">
                      Agreed
                    </Badge>
                  ) : (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-blue-700 ring-1 ring-blue-100">
                      {ratePct(row.payout_rate) ?? "—"}
                    </span>
                  )}
                </TableCell>
                <TableCell className={cn(MONEY, "font-semibold text-slate-900")}>
                  {inr(row.earned)}
                </TableCell>
                <TableCell className={MONEY}>
                  {inr(row.paid)}
                  {row.paid_on && <span className={SUB}>on {date(row.paid_on)}</span>}
                </TableCell>
                {showTds && <TableCell className={MONEY}>{inr(row.tds)}</TableCell>}
                {showTds && <TableCell className={MONEY}>{inr(row.net_paid)}</TableCell>}
                <TableCell
                  className={cn(MONEY, isPositive(row.pending) && "font-medium text-amber-600")}
                >
                  {inr(row.pending)}
                  {isPositive(row.overpaid) && (
                    <span className="block text-xs font-medium text-destructive">
                      Overpaid {inr(row.overpaid)}
                    </span>
                  )}
                </TableCell>
                <TableCell className={MONEY}>
                  {isPositive(row.balance) || isNegative(row.balance) ? (
                    <span
                      className={cn(
                        "inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1",
                        isPositive(row.balance)
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                          : "bg-rose-50 text-rose-700 ring-rose-100",
                      )}
                    >
                      {signedInr(row.balance)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <InvoiceCell row={row} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {date(row.last_disbursed_on)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

const BADGE = "border-transparent font-medium";

function InvoiceCell({ row }: { row: Row }) {
  const pending = isPositive(row.pending);
  let badge: React.ReactNode = null;
  let due: string | null = null;

  if (row.invoice_state === "overdue") {
    badge = <Badge className={cn(BADGE, "bg-red-100 text-red-700 hover:bg-red-100")}>Overdue</Badge>;
    due = row.invoice_due_date;
  } else if (row.invoice_state === "raised") {
    badge = (
      <Badge className={cn(BADGE, "bg-amber-100 text-amber-800 hover:bg-amber-100")}>Raised</Badge>
    );
    due = row.invoice_due_date;
  } else if (row.invoice_status === "paid" && !pending) {
    badge = (
      <Badge className={cn(BADGE, "bg-emerald-100 text-emerald-700 hover:bg-emerald-100")}>
        Paid
      </Badge>
    );
  } else if (row.invoice_state === "not_raised" && pending) {
    badge = (
      <Badge className={cn(BADGE, "bg-sky-100 text-sky-700 hover:bg-sky-100")}>Not raised</Badge>
    );
  }

  if (!badge && !row.invoice_number) return <span className="text-muted-foreground">—</span>;

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-2">
        {row.invoice_number && <span className="font-medium">{row.invoice_number}</span>}
        {badge}
      </div>
      {row.invoice_amount && <span className={SUB}>{inr(row.invoice_amount)}</span>}
      {due && <span className={SUB}>due {date(due)}</span>}
    </div>
  );
}
