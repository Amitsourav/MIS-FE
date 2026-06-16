"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Brand, BrandFilter } from "./types";

// The super-admin's selected company in the admin shell. Persisted in a readable
// cookie so it survives refreshes. This NEVER scopes API calls (the token does that);
// it only drives which UI/data we show a super-admin who can see both companies.
const COMPANY_COOKIE = "mis_admin_company";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function isBrandFilter(v: string | null): v is BrandFilter {
  return v === "fmc" || v === "av" || v === "both";
}

type Ctx = { company: BrandFilter; setCompany: (v: BrandFilter) => void };
const AdminCompanyContext = createContext<Ctx | null>(null);

export function AdminCompanyProvider({ children }: { children: React.ReactNode }) {
  const [company, setCompanyState] = useState<BrandFilter>("both");

  // Hydrate from cookie once on mount (avoids SSR/client mismatch).
  useEffect(() => {
    const saved = readCookie(COMPANY_COOKIE);
    if (isBrandFilter(saved)) setCompanyState(saved);
  }, []);

  function setCompany(v: BrandFilter) {
    setCompanyState(v);
    document.cookie = `${COMPANY_COOKIE}=${v}; path=/; max-age=${720 * 60}; samesite=lax`;
  }

  const value = useMemo(() => ({ company, setCompany }), [company]);
  return <AdminCompanyContext.Provider value={value}>{children}</AdminCompanyContext.Provider>;
}

export function useAdminCompany(): Ctx {
  const ctx = useContext(AdminCompanyContext);
  if (!ctx) throw new Error("useAdminCompany must be used within AdminCompanyProvider");
  return ctx;
}

// Resolve the effective company to display, given the signed-in admin's own scope.
// Company admins (me.brand set) are locked to their brand; super-admins (null) use
// whatever they picked in the switcher.
export function effectiveCompany(meBrand: Brand | null | undefined, picked: BrandFilter): BrandFilter {
  return meBrand ?? picked;
}
