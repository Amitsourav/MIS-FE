"use client";

import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminCompany } from "@/lib/admin-company";
import type { BrandFilter } from "@/lib/types";

const OPTIONS: { value: BrandFilter; label: string }[] = [
  { value: "fmc", label: "FMC" },
  { value: "av", label: "AV" },
  { value: "both", label: "Both" },
];

// Super-admin only — lets a super-admin scope the admin UI to one company or both.
// Company admins never see this (they are locked to their own company).
export function CompanySwitcher() {
  const { company, setCompany } = useAdminCompany();
  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-1.5 px-1 text-xs text-white/60">
        <Building2 className="h-3 w-3" />
        Company
      </p>
      <div className="inline-flex w-full rounded-md bg-white/10 p-0.5">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setCompany(opt.value)}
            className={cn(
              "flex-1 rounded px-2 py-1 text-xs font-medium transition-colors",
              company === opt.value
                ? "bg-white text-primary shadow-sm"
                : "text-white/70 hover:text-white",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
