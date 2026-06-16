import { Suspense } from "react";
import { Sidebar } from "@/components/shell/sidebar";
import { AdminCompanyProvider } from "@/lib/admin-company";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminCompanyProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-x-hidden bg-muted/10">
          <div className="mx-auto max-w-6xl px-6 py-6">
            <Suspense>{children}</Suspense>
          </div>
        </main>
      </div>
    </AdminCompanyProvider>
  );
}
