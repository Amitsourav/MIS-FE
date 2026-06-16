import { NextRequest, NextResponse } from "next/server";
import { backendUrl } from "@/lib/server/backend";
import { TOKEN_COOKIE, ROLE_COOKIE, BRAND_COOKIE } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Catch-all BFF proxy: forwards method/body/query to ${API_URL}/<path>,
// injects Authorization: Bearer <mis_token> from the cookie, and streams the
// response back (including CSV downloads). On backend 401, clears cookies so the
// client redirects to /login.
async function handler(req: NextRequest, ctx: { params: { path: string[] } }) {
  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  const path = ctx.params.path.join("/");
  const search = req.nextUrl.search.replace(/^\?/, "");

  const headers: Record<string, string> = {};
  const contentType = req.headers.get("content-type");
  if (contentType) headers["content-type"] = contentType;
  const accept = req.headers.get("accept");
  if (accept) headers["accept"] = accept;
  if (token) headers["authorization"] = `Bearer ${token}`;

  const hasBody = !["GET", "HEAD"].includes(req.method);
  let body: ArrayBuffer | undefined;
  if (hasBody) {
    body = await req.arrayBuffer();
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(backendUrl(`/${path}`, search), {
      method: req.method,
      headers,
      body: hasBody && body && body.byteLength > 0 ? body : undefined,
      redirect: "manual",
    });
  } catch {
    return NextResponse.json({ detail: "Backend unavailable" }, { status: 502 });
  }

  // Stream the body back, preserving content-type & content-disposition (CSV).
  const resHeaders = new Headers();
  const ct = backendRes.headers.get("content-type");
  if (ct) resHeaders.set("content-type", ct);
  const cd = backendRes.headers.get("content-disposition");
  if (cd) resHeaders.set("content-disposition", cd);

  const response = new NextResponse(backendRes.body, {
    status: backendRes.status,
    headers: resHeaders,
  });

  // Session expired upstream -> clear cookies so the client bounces to /login.
  if (backendRes.status === 401) {
    response.cookies.delete(TOKEN_COOKIE);
    response.cookies.delete(ROLE_COOKIE);
    response.cookies.delete(BRAND_COOKIE);
  }

  return response;
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
