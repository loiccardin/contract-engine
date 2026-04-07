// GET /api/articles — Liste tous les articles triés par order_index
// PUT /api/articles — (via /api/articles/[id]) Met à jour le contenu d'un article

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ success: true, data: [] });
}
