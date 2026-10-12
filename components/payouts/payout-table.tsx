"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TableRowsSkeleton } from "@/components/skeletons";
import { cn } from "@/lib/utils";
import { date, inr, isPositive, ratePct } from "@/lib/format";
import type { PayoutItem } from "@/lib/types";

type Row = PayoutItem & { source_name?: string | null };
const MONEY = "text-right tabular-nums whitespace-nowrap";

// One row per student × lender, in server order (last released, newest first).
// Headers are deliberately plain: there is no client-side sorting.
// `showSource` adds a CRM source column (admin "Unassigned payouts").
export function PayoutTable({
  items,
  loading,
  showSource = false,
}: {
  items: Row[];
  loading: boolean;
  showSource?: boolean;
}) {
  const cols = showSource ? 11 : 10;
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
            <TableHead className="whitespace-nowrap">Last released on</TableHead>
            <TableHead>Rate</TableHead>
            <TableHead className="text-right">Earned</TableHead>
            <TableHead className="text-right">Paid</TableHead>
            <TableHead className="text-right">Pending</TableHead>
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
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {date(row.last_disbursed_on)}
                </TableCell>
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
                <TableCell className={MONEY}>{inr(row.paid)}</TableCell>
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
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
