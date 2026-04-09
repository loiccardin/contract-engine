import { NextRequest, NextResponse } from "next/server";

async function hmacSha256(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function middleware(request: NextRequest) {
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
    return NextResponse.next();
  }

  const expectedSession = await hmacSha256(appSecret, loginPassword);

  if (sessionCookie !== expectedSession) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
