import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Centralized auth gate (Next 16 proxy convention). Redirects unauthenticated
// users to /login (and authenticated users away from the landing/login),
// based on the session cookie, before any page renders. The real
// session/org/role is resolved in getContext() for data and permission checks.
const PUBLIC_PREFIXES = ["/login", "/accept-invite"];
const PUBLIC_EXACT = ["/"]; // marketing landing

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(getSessionCookie(request));
  const isPublic =
    PUBLIC_EXACT.includes(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  if (!hasSession && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (hasSession && (pathname === "/" || pathname === "/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/runs";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Skip API routes, Next internals, and any static file (paths with a dot).
  matcher: ["/((?!api|_next/static|_next/image|.*\\.).*)"],
};
