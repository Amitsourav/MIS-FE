"use client";

import { useState } from "react";
import axios from "axios";
import { LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LogoutButton({
  collapsed = false,
  className,
}: {
  collapsed?: boolean;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    try {
      await axios.post("/api/auth/logout");
    } catch {
      // ignore — cookies cleared regardless
    } finally {
      // Full page load, not router.replace: it drops every cached query, so the
      // next person to log in never sees this user's email or data.
      window.location.replace("/login");
    }
  }

  return (
    <Button
      variant="ghost"
      size={collapsed ? "icon" : "sm"}
      onClick={logout}
      disabled={loading}
      className={cn("text-muted-foreground", className)}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
      {!collapsed && <span>Log out</span>}
    </Button>
  );
}
