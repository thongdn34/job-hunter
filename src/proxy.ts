import { NextResponse, type NextRequest } from "next/server";
import { checkRequest, parseAllowedHosts } from "@/server/request-guard";

/**
 * Next.js 16 Proxy (formerly middleware). Refuses requests for unknown Host names (DNS
 * rebinding) and cross-origin state-changing requests (CSRF) — see src/server/request-guard.ts.
 * Set ALLOWED_HOSTS when the app is served under a name other than localhost/127.0.0.1/[::1].
 */
export function proxy(request: NextRequest) {
  const verdict = checkRequest(
    {
      method: request.method,
      host: request.headers.get("host"),
      origin: request.headers.get("origin"),
      secFetchSite: request.headers.get("sec-fetch-site"),
    },
    parseAllowedHosts(process.env.ALLOWED_HOSTS),
  );
  if (!verdict.ok) return Response.json({ error: verdict.reason, code: "FORBIDDEN" }, { status: 403 });
  return NextResponse.next();
}

export const config = {
  // Everything except build assets (pages render private data too, so DNS rebinding applies to them).
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
