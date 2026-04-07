// POST /api/generate — Génère les 18 DOCX, uploade dans Drive, exporte PDF preview

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ success: false, error: "Non implémenté" }, { status: 501 });
}
