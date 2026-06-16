import { NextRequest, NextResponse } from "next/server";
import { TOKEN_COOKIE, ROLE_COOKIE, BRAND_COOKIE } from "@/lib/constants";

// Provider-only top-level paths.
const PROVIDER_PATHS = ["/dashboard", "/leads", "/payout"];

function isProviderPath(pathname: string): boolean {
  return PROVIDER_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}
function isAdminManagementPath(pathname: string): boolean {
  return pathname === "/admin/admins" || pathname.startsWith("/admin/admins/");
}

// Pure gatekeeping. The proxy + backend remain the real auth authority.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  const role = req.cookies.get(ROLE_COOKIE)?.value;
  // Non-empty => company-scoped admin; empty/absent => super-admin (or non-admin).
  const brand = req.cookies.get(BRAND_COOKIE)?.value;

  const protectedPath = isProviderPath(pathname) || isAdminPath(pathname);

  // Unauthenticated visiting a protected page -> login.
  if (protectedPath && !token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Authenticated user on /login -> bounce to their home.
  if (pathname === "/login" && token) {
    const url = req.nextUrl.clone();
    url.pathname = role === "admin" ? "/admin" : "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Wrong role for the area.
  if (token) {
    if (isAdminPath(pathname) && role !== "admin") {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
    if (isProviderPath(pathname) && role === "admin") {
      const url = req.nextUrl.clone();
      url.pathname = "/admin";
      url.search = "";
      return NextResponse.redirect(url);
    }
    // Admin-management is super-admin only. A company admin has a non-empty brand
    // cookie; bounce them away. The backend stays the real authority (403/404).
    if (role === "admin" && brand && isAdminManagementPath(pathname)) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/providers";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/dashboard/:path*", "/leads/:path*", "/payout/:path*", "/admin/:path*"],
};
