"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { parseFilters, updateSearchParams, type Filters } from "./filters";

// Reads filter state from the URL and writes patches back to it, so views are
// shareable and refresh-safe. Changing a filter resets paging to page 1 unless
// the patch itself sets page.
export function useUrlFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters: Filters = useMemo(
    () => parseFilters(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const setFilters = useCallback(
    (patch: Partial<Record<string, string | number | undefined>>) => {
      const resetsPage = !("page" in patch);
      const merged = resetsPage ? { ...patch, page: undefined } : patch;
      const qs = updateSearchParams(new URLSearchParams(searchParams.toString()), merged);
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  return { filters, setFilters };
}
