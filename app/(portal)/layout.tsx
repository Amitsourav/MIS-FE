import { Suspense } from "react";
import { Topbar } from "@/components/shell/topbar";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/20">
      <Suspense fallback={<div className="h-14 border-b bg-background" />}>
        <Topbar />
      </Suspense>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Suspense>{children}</Suspense>
      </main>
    </div>
  );
}
