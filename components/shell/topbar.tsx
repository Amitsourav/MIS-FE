"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUrlFilters } from "@/lib/use-filters";
import { useOverview, useMe } from "@/lib/queries";
import { DateRangePicker } from "./date-range-picker";
import { DataAsOf } from "./data-as-of";
import { LogoutButton } from "./logout-button";
import { BRAND_LABELS } from "@/lib/tokens";
import { BrandLogo } from "@/components/brand-logo";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
  { href: "/payout", label: "Payout" },
];

const NAV_ITEM = "relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors";

// Demo partner only: the CRM's AI calling (dialpad) screen. Unset = item hidden.
const AI_CALLING_URL = process.env.NEXT_PUBLIC_CRM_AI_CALLING_URL;

export function Topbar() {
  const pathname = usePathname();
  const { filters, setFilters } = useUrlFilters();
  // Payout has its own all-time-default date filter and "Data as of" chip.
  const ownsDateFilter = pathname === "/payout" || pathname.startsWith("/payout/");
  const { data: overview } = useOverview(filters, { enabled: !ownsDateFilter });
  const { data: me } = useMe();

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
      <div className="flex min-h-14 flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 sm:px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          {/* The partner's company: FundMyCampus or Admitverse. */}
          <BrandLogo brand={me?.brand} className="h-6 sm:h-7" />
          <span className="hidden border-l pl-2 text-sm font-medium text-muted-foreground sm:inline">
            {me?.brand ? "MIS" : "MIS Portal"}
          </span>
        </Link>

        <nav className="flex flex-wrap items-center gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  NAV_ITEM,
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
          {/* Sales demos only — real partners never see this. */}
          {me?.role === "provider" && me?.is_demo === true && AI_CALLING_URL && (
            <a
              href={AI_CALLING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                NAV_ITEM,
                "inline-flex items-center text-muted-foreground hover:text-foreground",
              )}
            >
              <Phone className="mr-1.5 h-4 w-4" />
              AI Calling
            </a>
          )}
        </nav>

        <div className="ml-auto flex flex-wrap items-center justify-end gap-2 sm:gap-3">
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
          <div className="flex items-center gap-2 border-l pl-2 sm:pl-3">
            <span
              title={me?.provider_name ?? undefined}
              className="hidden max-w-[180px] truncate text-sm text-muted-foreground md:inline"
            >
              {me?.email ?? ""}
            </span>
            <span className="md:hidden">
              <LogoutButton collapsed />
            </span>
            <span className="hidden md:inline">
              <LogoutButton />
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
