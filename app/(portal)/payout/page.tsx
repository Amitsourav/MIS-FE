"use client";

import { useSearchParams } from "next/navigation";
import { useUrlFilters } from "@/lib/use-filters";
import { usePayouts, payoutsExportUrl } from "@/lib/queries";
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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payout</h1>
        <p className="text-sm text-muted-foreground">
          What you have earned on students who have paid the processing fee to a lender.
        </p>
      </div>

      <PayoutsPanel
        query={query}
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
