import { redirect } from "next/navigation";

// Data is read live from the CRMs, so there is nothing to sync any more.
// Keep the old URL working for bookmarks.
export default function SyncRedirect() {
  redirect("/admin/providers");
}
