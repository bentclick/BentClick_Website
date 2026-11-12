import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";
import { cspHeaderName, strictCsp } from "@/lib/security/csp";

/**
 * Cheap optimistic gate: no session cookie → /login. This is NOT the
 * authorisation boundary — every page, action and route re-validates the
 * session server-side (src/lib/auth/session.ts).
 */
export function proxy(request: NextRequest) {
  const hasSession = Boolean(getSessionCookie(request));
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/dashboard") && !hasSession) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  return withCsp(request);
}

/** Next reads the nonce from the request header and stamps it on its own scripts; the browser enforces the response header. */
function withCsp(request: NextRequest) {
  const policy = strictCsp(Buffer.from(crypto.randomUUID()).toString("base64"));
  const headers = new Headers(request.headers);
  headers.set("content-security-policy", policy);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set(cspHeaderName(), policy);
  return response;
}

// Same areas as STRICT_PREFIXES in lib/security/csp.ts; a test compares them.
export const config = {
  matcher: ["/dashboard/:path*", "/login", "/ativar-2fa", "/esqueci-senha", "/redefinir-senha", "/g/:path*"],
};
