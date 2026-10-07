import { AlertCircle, Building2, Wallet } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

// Admitverse providers have no payouts — an explanation, never an error.
export function PayoutsUnsupported() {
  return (
    <EmptyState
      icon={<Building2 className="h-5 w-5" />}
      title="Payouts are tracked for FundMyCampus loans."
    />
  );
}

export function PayoutsNone({ onShowAllTime }: { onShowAllTime?: () => void }) {
  return (
    <EmptyState
      icon={<Wallet className="h-5 w-5" />}
      title="No earnings yet"
      description="They appear here once a student you sent pays the processing fee to a lender."
    >
      {onShowAllTime && (
        <Button variant="outline" size="sm" onClick={onShowAllTime}>
          Show all time
        </Button>
      )}
    </EmptyState>
  );
}

export function PayoutsError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <EmptyState
      icon={<AlertCircle className="h-5 w-5 text-destructive" />}
      title="Couldn't load payouts"
      description={message}
    >
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </EmptyState>
  );
}
