"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Trophy, Target, BarChart3, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMe } from "@/lib/queries";
import { BRAND_LABELS } from "@/lib/tokens";
import { LogoutButton } from "./logout-button";
import { CompanySwitcher } from "./company-switcher";

const NAV = [
  { href: "/admin/providers", label: "Providers", icon: Users },
  { href: "/admin/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/admin/targets", label: "Targets", icon: Target },
];
// Admin-management is super-admin only.
const SUPER_NAV = [{ href: "/admin/admins", label: "Admins", icon: ShieldCheck }];

export function Sidebar() {
  const pathname = usePathname();
  const { data: me } = useMe();
  // Admin whose brand is null = super-admin (sees both companies).
  const isSuperAdmin = me?.role === "admin" && (me?.brand == null);
  const nav = isSuperAdmin ? [...NAV, ...SUPER_NAV] : NAV;

  return (
    <aside className="flex w-60 flex-col border-r bg-muted/20">
      <div className="flex h-14 items-center gap-2 border-b px-5 font-semibold">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <BarChart3 className="h-4 w-4" />
        </span>
        MIS Admin
      </div>
      {isSuperAdmin ? (
        <div className="border-b p-3">
          <CompanySwitcher />
        </div>
      ) : (
        me?.brand && (
          <div className="border-b px-4 py-2.5 text-xs text-muted-foreground">
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
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-3">
        <p className="mb-2 truncate px-3 text-xs text-muted-foreground">{me?.email ?? ""}</p>
        <LogoutButton />
      </div>
    </aside>
  );
}
