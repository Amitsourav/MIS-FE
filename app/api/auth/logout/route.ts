import { NextRequest, NextResponse } from "next/server";
import { backendUrl } from "@/lib/server/backend";
import { TOKEN_COOKIE, ROLE_COOKIE, BRAND_COOKIE } from "@/lib/constants";

export const runtime = "nodejs";

// Clears cookies and best-effort notifies the backend.
export async function POST(req: NextRequest) {
  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  if (token) {
    try {
      await fetch(backendUrl("/auth/logout"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // ignore — we clear cookies regardless
    }
  }

  const response = NextResponse.json({ detail: "logged out" });
  response.cookies.delete(TOKEN_COOKIE);
  response.cookies.delete(ROLE_COOKIE);
  response.cookies.delete(BRAND_COOKIE);
  return response;
}
