import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    const loginPassword = process.env.LOGIN_PASSWORD;
    const appSecret = process.env.APP_SECRET;

    if (!loginPassword || !appSecret) {
      return NextResponse.json({ success: false, error: "Configuration serveur manquante" }, { status: 500 });
    }

    if (password !== loginPassword) {
      return NextResponse.json({ success: false, error: "Mot de passe incorrect" }, { status: 401 });
    }

    const sessionValue = createHmac("sha256", appSecret).update(loginPassword).digest("hex");

    const response = NextResponse.json({ success: true });
    response.cookies.set("session", sessionValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 90 * 24 * 60 * 60,
    });

    return response;
  } catch {
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}
