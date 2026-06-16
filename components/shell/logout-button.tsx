"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LogoutButton({ collapsed = false }: { collapsed?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    try {
      await axios.post("/api/auth/logout");
    } catch {
      // ignore — cookies cleared regardless
    } finally {
      router.replace("/login");
    }
  }

  return (
    <Button
      variant="ghost"
      size={collapsed ? "icon" : "sm"}
      onClick={logout}
      disabled={loading}
      className="text-muted-foreground"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
      {!collapsed && <span>Log out</span>}
    </Button>
  );
}
