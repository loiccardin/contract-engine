import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticate } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const authError = authenticate(request);
  if (authError) return authError;

  try {
    const articles = await prisma.article.findMany({
      orderBy: { orderIndex: "asc" },
    });

    return NextResponse.json({ success: true, data: articles });
  } catch (error) {
    console.error("GET /api/articles error:", error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la récupération des articles" },
      { status: 500 }
    );
  }
}
