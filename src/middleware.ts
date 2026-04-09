import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes — always allow
  if (
    pathname === "/login" ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // API routes — bearer token auth (handled by each route's authenticate() call)
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Frontend pages — session cookie auth
  const sessionCookie = request.cookies.get("session")?.value;
  const loginPassword = process.env.LOGIN_PASSWORD;
  const appSecret = process.env.APP_SECRET;

  if (!loginPassword || !appSecret) {
    // Config missing — allow access (dev mode without LOGIN_PASSWORD)
    return NextResponse.next();
  }

  const expectedSession = createHmac("sha256", appSecret).update(loginPassword).digest("hex");

  if (sessionCookie !== expectedSession) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
