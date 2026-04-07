import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticate } from "@/lib/auth";
import { assembleContract } from "@/lib/contract-assembler";
import { generateDocx } from "@/lib/docx-generator";
import { Article, Contract } from "@/types";

export async function POST(request: NextRequest) {
  const authError = authenticate(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const code = body.code as string;

    if (!code) {
      return NextResponse.json(
        { success: false, error: "Le champ 'code' est requis (ex: P1.P.CJ)" },
        { status: 400 }
      );
    }

    const contract = await prisma.contract.findUnique({ where: { code } });
    if (!contract) {
      return NextResponse.json(
        { success: false, error: `Contrat '${code}' non trouvé` },
        { status: 404 }
      );
    }

    const articles = await prisma.article.findMany({
      orderBy: { orderIndex: "asc" },
    });

    const assembled = assembleContract(
      articles as unknown as Article[],
      contract as unknown as Contract
    );

    const buffer = await generateDocx(assembled, contract as unknown as Contract);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${code}.docx"`,
      },
    });
  } catch (error) {
    console.error("POST /api/generate-test error:", error);
    return NextResponse.json(
      { success: false, error: `Erreur de génération: ${error instanceof Error ? error.message : "Erreur inconnue"}` },
      { status: 500 }
    );
  }
}
