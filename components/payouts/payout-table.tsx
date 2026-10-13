"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TableRowsSkeleton } from "@/components/skeletons";
import { cn } from "@/lib/utils";
import { date, inr, isNegative, isPositive, ratePct, signedInr } from "@/lib/format";
import type { PayoutItem } from "@/lib/types";

type Row = PayoutItem & { source_name?: string | null };

const MONEY = "text-right tabular-nums whitespace-nowrap";
const SUB = "block text-xs font-normal text-muted-foreground";

// One row per student × lender, in server order (last released, newest first).
// Headers are deliberately plain: there is no client-side sorting.
// `showSource` adds a CRM source column (admin "Unassigned payouts").
// TDS / Net paid only appear when some row on this page has TDS.
export function PayoutTable({
  items,
  loading,
  showSource = false,
}: {
  items: Row[];
  loading: boolean;
  showSource?: boolean;
}) {
  const showTds = items.some((r) => isPositive(r.tds));
  const cols = 13 + (showSource ? 1 : 0) + (showTds ? 2 : 0);
  return (
    <div className="rounded-lg border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">#</TableHead>
            {showSource && <TableHead>Source</TableHead>}
            <TableHead>Student</TableHead>
            <TableHead>Lender</TableHead>
            <TableHead className="text-right">Loan amount</TableHead>
            <TableHead
              className="whitespace-nowrap text-right"
              title="What the bank has released so far. Your payout is your rate on this."
            >
              Disbursed so far
            </TableHead>
            <TableHead>Rate</TableHead>
            <TableHead className="text-right">Earned</TableHead>
            <TableHead className="text-right">Paid</TableHead>
            {showTds && <TableHead className="text-right">TDS</TableHead>}
            {showTds && <TableHead className="whitespace-nowrap text-right">Net paid</TableHead>}
            <TableHead className="text-right">Pending</TableHead>
            <TableHead
              className="text-right"
              title="Earned − paid. + still to be paid; − paid extra, adjusted on the next bill."
            >
              Balance
            </TableHead>
            <TableHead>Invoice</TableHead>
            <TableHead className="whitespace-nowrap">Last released on</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRowsSkeleton rows={6} cols={cols} />
          ) : (
            items.map((row, i) => (
              <TableRow key={`${row.serial_no ?? "na"}-${row.bank_name ?? "na"}-${i}`}>
                <TableCell className="tabular-nums text-muted-foreground">
                  {row.serial_no ?? "—"}
                </TableCell>
                {showSource && (
                  <TableCell className="whitespace-nowrap">{row.source_name ?? "—"}</TableCell>
                )}
                <TableCell className="font-medium">{row.full_name ?? "—"}</TableCell>
                <TableCell className="whitespace-nowrap">{row.bank_name ?? "—"}</TableCell>
                <TableCell className={MONEY}>{inr(row.loan_amount)}</TableCell>
                <TableCell className={MONEY}>{inr(row.disbursed_total)}</TableCell>
                <TableCell>
                  {row.payout_basis === "agreed" ? (
                    <Badge variant="secondary" className="font-medium">
                      Agreed
                    </Badge>
                  ) : (
                    <span className="tabular-nums">{ratePct(row.payout_rate) ?? "—"}</span>
                  )}
                </TableCell>
                <TableCell className={cn(MONEY, "font-medium")}>{inr(row.earned)}</TableCell>
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
                <TableCell
                  className={cn(
                    MONEY,
                    "font-medium",
                    isPositive(row.balance) && "text-emerald-600",
                    isNegative(row.balance) && "text-destructive",
                  )}
                >
                  {isPositive(row.balance) || isNegative(row.balance)
                    ? signedInr(row.balance)
                    : "—"}
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
    badge = <Badge variant="secondary" className="font-medium">Not raised</Badge>;
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
