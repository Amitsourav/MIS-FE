import { NextRequest, NextResponse } from "next/server";
import { backendUrl } from "@/lib/server/backend";
import { TOKEN_COOKIE, ROLE_COOKIE, BRAND_COOKIE, COOKIE_MAX_AGE } from "@/lib/constants";

export const runtime = "nodejs";

// Receives {email,password}, calls backend /auth/login, and on success sets the
// httpOnly token cookie + a readable role cookie. Never returns the token to JS.
export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ detail: "Invalid request body" }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(backendUrl("/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: body.email, password: body.password }),
    });
  } catch {
    return NextResponse.json({ detail: "Backend unavailable" }, { status: 502 });
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return NextResponse.json(
      { detail: (data as { detail?: string }).detail || "Login failed" },
      { status: res.status },
    );
  }

  const token = (data as { access_token?: string }).access_token;
  const role = (data as { role?: string }).role;
  // null = super-admin (sees both companies); "fmc"/"av" = company-scoped.
  const brand = (data as { brand?: string | null }).brand ?? null;
  if (!token || !role) {
    return NextResponse.json({ detail: "Malformed login response" }, { status: 502 });
  }

  const response = NextResponse.json({ role, brand });
  const secure = process.env.NODE_ENV === "production";
  response.cookies.set(TOKEN_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  response.cookies.set(ROLE_COOKIE, role, {
    httpOnly: false,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  // Readable brand cookie powers middleware/UI scoping. Empty string for super-admin.
  response.cookies.set(BRAND_COOKIE, brand ?? "", {
    httpOnly: false,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  return response;
}
