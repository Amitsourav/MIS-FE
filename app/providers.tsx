"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { isAxiosError } from "axios";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Every request reads the CRMs live (~1–2 s), so don't refetch more
            // often than this, and never on window focus.
            staleTime: 45_000,
            refetchOnWindowFocus: false,
            // One quick retry on 5xx (incl. 503 "CRM unavailable"), then show the
            // error state with a Retry button instead of a long skeleton.
            retry: (count, error) => {
              const status = isAxiosError(error) ? error.response?.status ?? 0 : 0;
              return status >= 500 && count < 1;
            },
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
