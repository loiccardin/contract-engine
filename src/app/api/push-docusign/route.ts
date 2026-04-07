// POST /api/push-docusign — Archive les docs actuels, met à jour les 18 templates DocuSign

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ success: false, error: "Non implémenté" }, { status: 501 });
}
