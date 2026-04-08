import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticate } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const authError = authenticate(request);
  if (authError) return authError;

  try {
    const contracts = await prisma.contract.findMany({ orderBy: { id: "asc" } });
    return NextResponse.json({ success: true, data: contracts });
  } catch (error) {
    console.error("GET /api/contracts error:", error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la récupération des contrats" },
      { status: 500 }
    );
  }
}
