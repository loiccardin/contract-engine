import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { prisma } from "@/lib/db";
import { authenticate } from "@/lib/auth";
import { assembleContract } from "@/lib/contract-assembler";
import { generateDocx } from "@/lib/docx-generator";
import { Article, Contract } from "@/types";

export async function POST(request: NextRequest) {
  const authError = authenticate(request);
  if (authError) return authError;

  try {
    const articles = await prisma.article.findMany({ orderBy: { orderIndex: "asc" } });
    const contracts = await prisma.contract.findMany({ orderBy: { id: "asc" } });

    const zip = new JSZip();

    for (const contract of contracts) {
      const assembled = assembleContract(
        articles as unknown as Article[],
        contract as unknown as Contract
      );
      const buffer = await generateDocx(assembled, contract as unknown as Contract);
      zip.file(`${contract.code}.docx`, buffer);
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    const date = new Date().toISOString().slice(0, 10);

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="contrats-${date}.zip"`,
      },
    });
  } catch (error) {
    console.error("POST /api/generate-test-all error:", error);
    return NextResponse.json(
      { success: false, error: `Erreur: ${error instanceof Error ? error.message : "Erreur inconnue"}` },
      { status: 500 }
    );
  }
}
