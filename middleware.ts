import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { buildCsp } from "@/lib/csp";

function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Every page gets a fresh nonce. Next.js reads the nonce from the request's
 * CSP header and stamps its own script tags with it, so the framework keeps
 * working while raw inline scripts are still blocked.
 *
 * /report-only gets the same policy in Content-Security-Policy-Report-Only:
 * violations are reported but nothing is actually blocked.
 */
export function middleware(request: NextRequest) {
  const nonce = createNonce();
  const dev = process.env.NODE_ENV !== "production";
  // Home embeds the walkthrough. Lab pages stay frame-src 'self'.
  const policy = buildCsp(nonce, dev, request.nextUrl.pathname === "/");
  const isReportOnly = request.nextUrl.pathname.startsWith("/report-only");
  const responseHeader = isReportOnly
    ? "Content-Security-Policy-Report-Only"
    : "Content-Security-Policy";

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  // Always present so Next.js can find and apply the nonce.
  requestHeaders.set("Content-Security-Policy", policy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(responseHeader, policy);

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
