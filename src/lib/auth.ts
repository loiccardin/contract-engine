import { NextRequest, NextResponse } from "next/server";

export function authenticate(request: NextRequest): NextResponse | null {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { success: false, error: "Non authentifié" },
      { status: 401 }
    );
  }

  const token = authHeader.replace("Bearer ", "");

  if (token !== process.env.APP_SECRET) {
    return NextResponse.json(
      { success: false, error: "Non authentifié" },
      { status: 401 }
    );
  }

  return null;
}
