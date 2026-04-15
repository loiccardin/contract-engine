import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticate } from "@/lib/auth";
import { assembleContract } from "@/lib/contract-assembler";
import { generateDocx } from "@/lib/docx-generator";
import {
  archiveCurrentContratsFolder,
  createContratsOutputFolder,
  uploadContratDocx,
} from "@/lib/google-drive";
import { Article, Contract } from "@/types";

/**
 * POST /api/generate-contrats
 *
 * Génère les 24 contrats définitifs (C1-C8) en DOCX et les uploade dans
 * le dossier Drive `GOOGLE_DRIVE_CONTRATS_FOLDER_ID`. Pas de PDF,
 * pas de DocuSign, pas de PowerForm.
 */
export async function POST(request: NextRequest) {
  const authError = authenticate(request);
  if (authError) return authError;

  try {
    const articles = await prisma.article.findMany({ orderBy: { orderIndex: "asc" } });
    const contracts = await prisma.contract.findMany({
      where: { documentType: "contrat" },
      orderBy: { id: "asc" },
    });

    // 1. Archiver l'éventuel dossier "(en cours)" précédent
    const archived = await archiveCurrentContratsFolder();

    // 2. Créer le nouveau dossier daté
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getFullYear()).slice(-2)}`;
    const folderId = await createContratsOutputFolder(dateStr);
    const folderUrl = `https://drive.google.com/drive/folders/${folderId}`;

    // 3. Générer + uploader chaque contrat
    const results: { code: string; status: string; drive_file_id?: string; drive_file_url?: string; article_count?: number }[] = [];
    const errors: { code: string; error: string }[] = [];

    for (const contract of contracts) {
      try {
        const assembled = assembleContract(
          articles as unknown as Article[],
          contract as unknown as Contract,
          "contrat"
        );

        const docxBuffer = await generateDocx(
          assembled,
          contract as unknown as Contract,
          "contrat"
        );

        const { fileId, fileUrl } = await uploadContratDocx(folderId, contract.code, docxBuffer);

        await prisma.contract.update({
          where: { code: contract.code },
          data: { googleDocId: fileId },
        });

        results.push({
          code: contract.code,
          status: "ok",
          drive_file_id: fileId,
          drive_file_url: fileUrl,
          article_count: assembled.length,
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
        generated_at: now.toISOString(),
        folder_id: folderId,
        folder_url: folderUrl,
        archived,
        contracts: results,
        errors,
      },
    });
  } catch (error) {
    console.error("POST /api/generate-contrats error:", error);
    return NextResponse.json(
      { success: false, error: `Erreur: ${error instanceof Error ? error.message : "Erreur inconnue"}` },
      { status: 500 }
    );
  }
}
