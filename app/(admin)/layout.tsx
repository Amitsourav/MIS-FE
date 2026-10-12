import { Suspense } from "react";
import { Sidebar } from "@/components/shell/sidebar";
import { AdminCompanyProvider } from "@/lib/admin-company";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminCompanyProvider>
      <div className="flex min-h-screen flex-col md:flex-row">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-x-hidden bg-muted/10">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
            <Suspense>{children}</Suspense>
          </div>
        </main>
      </div>
    </AdminCompanyProvider>
  );
}
