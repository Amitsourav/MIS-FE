"use client";

import { useSearchParams } from "next/navigation";
import { Wallet } from "lucide-react";
import { useUrlFilters } from "@/lib/use-filters";
import { usePayouts, usePayoutsMonthly, payoutsExportUrl } from "@/lib/queries";
import { PayoutsPanel } from "@/components/payouts/payouts-panel";
import { PAGE_SIZES } from "@/components/pagination";
import type { PayoutFilters } from "@/lib/types";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

// Unlike the dashboard, this page defaults to ALL TIME: no from/to in the URL means
// no date params are sent. So read the raw params instead of parseFilters(), which
// fills in a 30-day default.
function readPayoutParams(sp: URLSearchParams) {
  const from = sp.get("from");
  const to = sp.get("to");
  const filters: PayoutFilters = {
    date_from: from && YMD.test(from) ? from : undefined,
    date_to: to && YMD.test(to) ? to : undefined,
  };
  const page = Number(sp.get("page"));
  const pageSize = Number(sp.get("page_size"));
  return {
    filters,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    pageSize: (PAGE_SIZES as readonly number[]).includes(pageSize) ? pageSize : 50,
  };
}

export default function PayoutPage() {
  const searchParams = useSearchParams();
  const { setFilters } = useUrlFilters(); // URL writer; resets page unless the patch sets it
  const { filters, page, pageSize } = readPayoutParams(new URLSearchParams(searchParams.toString()));
  const query = usePayouts(filters, page, pageSize);
  const monthlyQuery = usePayoutsMonthly(filters);

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-500 px-6 py-6 text-white shadow-md">
        <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-20 right-24 h-40 w-40 rounded-full bg-white/10" />
        <div className="relative flex items-center gap-4">
          <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 sm:flex">
            <Wallet className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Payout</h1>
            <p className="text-sm text-white/80">
              What you have earned on the loan amounts banks have released for your students.
            </p>
          </div>
        </div>
      </div>

      <PayoutsPanel
        query={query}
        monthlyQuery={monthlyQuery}
        filters={filters}
        onFiltersChange={(f) =>
          setFilters({ from: f.date_from, to: f.date_to, all_time: undefined })
        }
        page={page}
        pageSize={pageSize}
        onPageChange={(p) => setFilters({ page: p })}
        onPageSizeChange={(n) => setFilters({ page_size: n, page: 1 })}
        exportHref={payoutsExportUrl(filters)}
      />
    </div>
  );
}
