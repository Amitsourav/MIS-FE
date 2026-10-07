"use client";

import { AlertCircle, CloudOff, RefreshCw } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { errorMessage, isUnavailable } from "@/lib/api";

// Error state for a panel/page that has no data to show. 503 means a CRM is
// briefly unreachable (data is read live), so say so and offer a retry.
// 401 never gets here: the API client sends the user to /login.
export function QueryError({
  error,
  onRetry,
  title,
  className,
}: {
  error: unknown;
  onRetry: () => void;
  title?: string;
  className?: string;
}) {
  const unavailable = isUnavailable(error);
  return (
    <EmptyState
      className={className}
      icon={
        unavailable ? (
          <CloudOff className="h-5 w-5" />
        ) : (
          <AlertCircle className="h-5 w-5 text-destructive" />
        )
      }
      title={unavailable ? "Data source temporarily unavailable" : title ?? "Couldn't load data"}
      description={unavailable ? "Please retry in a moment." : errorMessage(error)}
    >
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="h-4 w-4" />
        Retry
      </Button>
    </EmptyState>
  );
}
