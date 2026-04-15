import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticate } from "@/lib/auth";
import { assembleContract } from "@/lib/contract-assembler";
import { generateDocx } from "@/lib/docx-generator";
import {
  archiveCurrentFolders,
  createOutputFolders,
  uploadDocx,
  getFileName,
} from "@/lib/google-drive";
import { Article, Contract } from "@/types";

export async function POST(request: NextRequest) {
  const authError = authenticate(request);
  if (authError) return authError;

  try {
    const articles = await prisma.article.findMany({ orderBy: { orderIndex: "asc" } });
    // Limiter aux promesses — la table contient désormais aussi les contrats C*
    // qui sont générés par /api/generate-contrats.
    const contracts = await prisma.contract.findMany({
      where: { documentType: "promesse" },
      orderBy: { id: "asc" },
    });

    // 1. Archive existing "(en cours)" folders
    const archived = await archiveCurrentFolders();

    // 2. Create new output folder with today's date (DOCX only, no PDF folder)
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getFullYear()).slice(-2)}`;
    const { docsFolderId } = await createOutputFolders(dateStr);

    // 3. Generate + upload each DOCX
    const results: {
      code: string;
      status: string;
      googleDocUrl?: string;
      articleCount?: number;
    }[] = [];
    const errors: { code: string; error: string }[] = [];

    for (const contract of contracts) {
      try {
        const assembled = assembleContract(
          articles as unknown as Article[],
          contract as unknown as Contract
        );

        const docxBuffer = await generateDocx(assembled, contract as unknown as Contract);
        const fileName = getFileName(contract.code);

        // Upload DOCX natif dans Drive
        const { fileId, fileUrl: googleDocUrl } = await uploadDocx(
          docsFolderId,
          fileName,
          docxBuffer
        );

        // Update DB with DOCX file ID
        await prisma.contract.update({
          where: { code: contract.code },
          data: { googleDocId: fileId },
        });

        results.push({
          code: contract.code,
          status: "ok",
          googleDocUrl,
          articleCount: assembled.length,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur inconnue";
        console.error(`Erreur génération ${contract.code}:`, message);
        errors.push({ code: contract.code, error: message });
        results.push({ code: contract.code, status: "error" });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        generatedAt: now.toISOString(),
        archived,
        docsFolderId,
        contracts: results,
        errors,
      },
    });
  } catch (error) {
    console.error("POST /api/generate error:", error);
    return NextResponse.json(
      { success: false, error: `Erreur: ${error instanceof Error ? error.message : "Erreur inconnue"}` },
      { status: 500 }
    );
  }
}
