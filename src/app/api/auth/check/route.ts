import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get("session")?.value;
  const loginPassword = process.env.LOGIN_PASSWORD;
  const appSecret = process.env.APP_SECRET;

  if (!loginPassword || !appSecret) {
    return NextResponse.json({ success: true }); // no auth configured
  }

  const expected = createHmac("sha256", appSecret).update(loginPassword).digest("hex");

  if (sessionCookie === expected) {
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: false }, { status: 401 });
}
