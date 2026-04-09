import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";

export function authenticate(request: NextRequest): NextResponse | null {
  // Method 1: Bearer token (machine-to-machine, scripts, external calls)
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    if (token === process.env.APP_SECRET) {
      return null; // authenticated
    }
  }

  // Method 2: Session cookie (frontend, set by /api/auth/login)
  const sessionCookie = request.cookies.get("session")?.value;
  const loginPassword = process.env.LOGIN_PASSWORD;
  const appSecret = process.env.APP_SECRET;

  if (sessionCookie && loginPassword && appSecret) {
    const expected = createHmac("sha256", appSecret).update(loginPassword).digest("hex");
    if (sessionCookie === expected) {
      return null; // authenticated
    }
  }

  return NextResponse.json(
    { success: false, error: "Non authentifié" },
    { status: 401 }
  );
}
