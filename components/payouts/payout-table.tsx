"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TableRowsSkeleton } from "@/components/skeletons";
import { cn } from "@/lib/utils";
import { date, inr, ratePct } from "@/lib/format";
import type { PayoutItem } from "@/lib/types";

const COLS = 10;
const MONEY = "text-right tabular-nums whitespace-nowrap";

// One row per student × lender, in server order (PF paid, newest first).
// Headers are deliberately plain: there is no client-side sorting.
export function PayoutTable({ items, loading }: { items: PayoutItem[]; loading: boolean }) {
  return (
    <div className="rounded-lg border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">#</TableHead>
            <TableHead>Student</TableHead>
            <TableHead>Lender</TableHead>
            <TableHead className="text-right">Loan amount</TableHead>
            <TableHead className="whitespace-nowrap">PF paid on</TableHead>
            <TableHead>Rate</TableHead>
            <TableHead className="text-right">Earned</TableHead>
            <TableHead className="text-right">Paid</TableHead>
            <TableHead className="text-right">Pending</TableHead>
            <TableHead
              className="whitespace-nowrap text-right"
              title="Information only: what the lender has released so far. Not the basis of your payout."
            >
              Disbursed so far
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRowsSkeleton rows={6} cols={COLS} />
          ) : (
            items.map((row, i) => (
              <TableRow key={`${row.serial_no ?? "na"}-${row.bank_name ?? "na"}-${i}`}>
                <TableCell className="tabular-nums text-muted-foreground">
                  {row.serial_no ?? "—"}
                </TableCell>
                <TableCell className="font-medium">{row.full_name ?? "—"}</TableCell>
                <TableCell className="whitespace-nowrap">{row.bank_name ?? "—"}</TableCell>
                <TableCell className={MONEY}>{inr(row.loan_amount)}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {date(row.pf_paid_on)}
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
                  className={cn(MONEY, Number(row.pending) > 0 && "font-medium text-amber-600")}
                >
                  {inr(row.pending)}
                </TableCell>
                <TableCell className={cn(MONEY, "text-muted-foreground")}>
                  {inr(row.disbursed_total)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
