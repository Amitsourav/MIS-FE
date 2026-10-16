"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Trophy, Target, ShieldCheck, Wallet, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMe } from "@/lib/queries";
import { BRAND_LABELS } from "@/lib/tokens";
import { useAdminCompany, effectiveCompany } from "@/lib/admin-company";
import { BrandLogo } from "@/components/brand-logo";
import { LogoutButton } from "./logout-button";
import { CompanySwitcher } from "./company-switcher";

const NAV = [
  { href: "/admin/providers", label: "Providers", icon: Users },
  { href: "/admin/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/admin/targets", label: "Targets", icon: Target },
];
// Payouts exist for FundMyCampus only: FMC and super admins.
const FMC_NAV = [
  {
    href: "/admin/unassigned-payouts",
    label: "Unassigned payouts",
    icon: Wallet,
  },
];
// Admin-management is super-admin only.
const SUPER_NAV = [{ href: "/admin/admins", label: "Admins", icon: ShieldCheck }];

export function Sidebar() {
  const pathname = usePathname();
  const { data: me } = useMe();
  // Admin whose brand is null = super-admin (sees both companies).
  const isSuperAdmin = me?.role === "admin" && me?.brand == null;
  const seesPayouts = me?.role === "admin" && (me.brand == null || me.brand === "fmc");
  const nav = [...NAV, ...(seesPayouts ? FMC_NAV : []), ...(isSuperAdmin ? SUPER_NAV : [])];
  // Below md the sidebar is a slide-in menu opened from a slim top bar.
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  // Logo of the company in view: a company admin's own, or the super-admin's pick.
  // "Both" (or still loading) shows the neutral MIS mark.
  const { company } = useAdminCompany();
  const picked = me ? effectiveCompany(me.brand, company) : "both";
  const logoBrand = picked === "both" ? null : picked;

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background px-4 font-semibold md:hidden">
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
          className="-ml-1 rounded-md p-1.5 text-muted-foreground hover:bg-accent"
        >
          <Menu className="h-5 w-5" />
        </button>
        <BrandLogo brand={logoBrand} className="h-6" />
        <span className={cn(logoBrand && "border-l pl-2 text-sm font-medium text-muted-foreground")}>
          {logoBrand ? "Admin" : "MIS Admin"}
        </span>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setOpen(false)} />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-primary text-primary-foreground transition-transform md:sticky md:top-0 md:z-auto md:h-screen md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b border-white/10 px-5 font-semibold">
          {logoBrand ? (
            // The FMC logo has dark text, so it sits on a white tile on the navy sidebar.
            <span className={cn("flex items-center rounded-md", logoBrand === "fmc" && "bg-white px-2 py-1")}>
              <BrandLogo brand={logoBrand} className={logoBrand === "fmc" ? "h-5" : "h-7"} />
            </span>
          ) : (
            <BrandLogo brand={null} fallbackClassName="bg-white text-primary" />
          )}
          <span className={cn(logoBrand && "text-sm font-medium text-white/70")}>
            {logoBrand ? "Admin" : "MIS Admin"}
          </span>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="ml-auto rounded-md p-1 text-white/70 hover:bg-white/10 md:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {isSuperAdmin ? (
          <div className="border-b border-white/10 p-3">
            <CompanySwitcher />
          </div>
        ) : (
          me?.brand && (
            <div className="border-b border-white/10 px-5 py-2.5 text-xs text-white/70">
              {BRAND_LABELS[me.brand]}
            </div>
          )
        )}
        <nav className="flex-1 space-y-1 p-3">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-white/10 text-white before:absolute before:inset-y-1.5 before:left-0 before:w-1 before:rounded-full before:bg-teal-400"
                    : "text-white/65 hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-3">
          <p className="mb-2 truncate px-3 text-xs text-white/60">{me?.email ?? ""}</p>
          <LogoutButton className="text-white/70 hover:bg-white/10 hover:text-white" />
        </div>
      </aside>
    </>
  );
}
