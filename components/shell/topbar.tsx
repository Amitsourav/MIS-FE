"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUrlFilters } from "@/lib/use-filters";
import { useOverview, useMe } from "@/lib/queries";
import { DateRangePicker } from "./date-range-picker";
import { DataAsOf } from "./data-as-of";
import { LogoutButton } from "./logout-button";
import { BRAND_LABELS } from "@/lib/tokens";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
  { href: "/payout", label: "Payout" },
];

export function Topbar() {
  const pathname = usePathname();
  const { filters, setFilters } = useUrlFilters();
  // Payout has its own all-time-default date filter and "Data as of" chip.
  const ownsDateFilter = pathname === "/payout" || pathname.startsWith("/payout/");
  const { data: overview } = useOverview(filters, { enabled: !ownsDateFilter });
  const { data: me } = useMe();

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
      <div className="flex h-14 items-center gap-4 px-4 sm:px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <BarChart3 className="h-4 w-4" />
          </span>
          <span className="hidden sm:inline">MIS Portal</span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {!ownsDateFilter && <DataAsOf value={overview?.data_as_of} />}
          {/* A provider belongs to one company — show it as a read-only label.
              No switcher: the backend scopes data by the JWT. */}
          {me?.brand && (
            <span className="hidden rounded-md border bg-muted/50 px-2.5 py-1 text-sm font-medium text-muted-foreground sm:inline">
              {BRAND_LABELS[me.brand]}
            </span>
          )}
          {!ownsDateFilter && (
            <DateRangePicker
              from={filters.from}
              to={filters.to}
              allTime={!!filters.allTime}
              onChange={(r) => setFilters({ from: r.from, to: r.to, all_time: undefined })}
              onAllTime={() => setFilters({ all_time: "1", from: undefined, to: undefined })}
            />
          )}
          <div className="hidden items-center gap-2 border-l pl-3 md:flex">
            <span className="max-w-[140px] truncate text-sm text-muted-foreground">
              {me?.provider_name ?? me?.email ?? ""}
            </span>
            <LogoutButton />
          </div>
        </div>
      </div>
    </header>
  );
}
