import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticate } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = authenticate(request);
  if (authError) return authError;

  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json(
      { success: false, error: "ID invalide" },
      { status: 400 }
    );
  }

  try {
    const article = await prisma.article.findUnique({ where: { id } });

    if (!article) {
      return NextResponse.json(
        { success: false, error: "Article non trouvé" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: article });
  } catch (error) {
    console.error(`GET /api/articles/${id} error:`, error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la récupération de l'article" },
      { status: 500 }
    );
  }
}

const UPDATABLE_FIELDS = [
  "title",
  "contentCommon",
  "contentClassique",
  "contentStudio",
  "content20pct",
  "contentParticulier",
  "contentSociete",
  "contentZonesCj",
  "contentZonesR",
  "contentSansMenage",
  "contentStandard",
  "contentCourte",
  "isPageBreakBefore",
  "keepTogether",
] as const;

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = authenticate(request);
  if (authError) return authError;

  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json(
      { success: false, error: "ID invalide" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    for (const field of UPDATABLE_FIELDS) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: "Aucun champ à mettre à jour" },
        { status: 400 }
      );
    }

    const article = await prisma.article.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: article });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Record to update not found")
    ) {
      return NextResponse.json(
        { success: false, error: "Article non trouvé" },
        { status: 404 }
      );
    }
    console.error(`PUT /api/articles/${id} error:`, error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la mise à jour de l'article" },
      { status: 500 }
    );
  }
}
