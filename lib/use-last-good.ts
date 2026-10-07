"use client";

import { useEffect, useRef } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { toast } from "@/components/ui/sonner";
import { errorMessage } from "./api";

// The backend reads the CRMs live, so a refresh can fail (503) while we already
// have good data. A failed fetch for a *new* key (e.g. a filter change) drops
// placeholder data, so remember the last successful response and keep showing it,
// with a toast, instead of blanking the panel.
//
// Returns `data` to render (fresh, or the last good copy after a failure) and
// `error` only when there is nothing to show (render an error state then).
export function useLastGood<T>(query: UseQueryResult<T>, refreshFailedMessage?: string) {
  const last = useRef<T | undefined>(undefined);
  useEffect(() => {
    if (query.data !== undefined) last.current = query.data;
  }, [query.data]);

  const data = query.data ?? (query.isError ? last.current : undefined);
  const showingStale = query.isError && data !== undefined;

  useEffect(() => {
    if (!showingStale) return;
    // One toast per page, however many panels failed together.
    toast.error(refreshFailedMessage ?? "Couldn't refresh — showing the last data.", {
      id: "refresh-failed",
      description: errorMessage(query.error),
    });
  }, [showingStale, query.errorUpdatedAt, query.error, refreshFailedMessage]);

  return {
    data,
    error: query.isError && data === undefined ? query.error : null,
  };
}
