// GET /api/versions — Liste l'historique des pushs DocuSign (plus récent en premier)

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ success: true, data: [] });
}
