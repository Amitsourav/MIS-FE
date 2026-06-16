import { Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";

export default function PayoutPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payout</h1>
        <p className="text-sm text-muted-foreground">Payouts &amp; disputes.</p>
      </div>
      <Card>
        <CardContent className="py-6">
          <EmptyState
            className="border-0"
            icon={<Wallet className="h-5 w-5" />}
            title="Coming soon"
            description="Once the billing model is finalized, your payouts and any disputes will appear here — itemized by brand and period."
          />
        </CardContent>
      </Card>
    </div>
  );
}
