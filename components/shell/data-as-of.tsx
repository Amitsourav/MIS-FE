"use client";

import { Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { dateTime } from "@/lib/format";

export function DataAsOf({ value }: { value: string | null | undefined }) {
  if (!value) return null;
  const d = new Date(value);
  const rel = Number.isNaN(d.getTime()) ? "—" : `${formatDistanceToNow(d)} ago`;
  return (
    <span
      title={dateTime(value)}
      className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground"
    >
      <Clock className="h-3 w-3" />
      Data as of {rel}
    </span>
  );
}
