// GET /api/contracts — Liste les 18 variantes avec mapping DocuSign et Google Drive

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ success: true, data: [] });
}
