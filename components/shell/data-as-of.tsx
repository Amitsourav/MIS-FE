"use client";

import { dateTime } from "@/lib/format";

// The backend reads the CRMs live, so data_as_of is just the request time.
// Show "Live" rather than a timestamp that would suggest the data might be old.
export function DataAsOf({ value }: { value: string | null | undefined }) {
  if (!value) return null;
  return (
    <span
      title={`Updated ${dateTime(value)}`}
      className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      Live
    </span>
  );
}
