import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticate } from "@/lib/auth";
import { convertDocxToPdf } from "@/lib/pdf-converter";
import { downloadFile } from "@/lib/google-drive";
import { getAccessToken, reactivatePowerForm } from "@/lib/docusign";

const BASE_URL = process.env.DOCUSIGN_BASE_URL!;
const ACCOUNT_ID = process.env.DOCUSIGN_ACCOUNT_ID!;

export async function POST(request: NextRequest) {
  const authError = authenticate(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const contractCode = body.contractCode as string;

    if (!contractCode) {
      return NextResponse.json({ success: false, error: "contractCode requis" }, { status: 400 });
    }

    const contract = await prisma.contract.findUnique({ where: { code: contractCode } });
    if (!contract) {
      return NextResponse.json({ success: false, error: `Contrat '${contractCode}' non trouvé` }, { status: 404 });
    }

    if (!contract.googleDocId) {
      return NextResponse.json({ success: false, error: "Pas de google_doc_id — lancez /api/generate d'abord" }, { status: 400 });
    }

    if (!contract.docusignTemplateId) {
      return NextResponse.json({ success: false, error: "Pas de template DocuSign — lancez le push complet d'abord" }, { status: 400 });
    }

    // 1. Download DOCX from Drive (as-is, may have been manually edited)
    const docxBuffer = await downloadFile(contract.googleDocId);

    // 2. Convert to PDF via LibreOffice
    const pdfBuffer = await convertDocxToPdf(docxBuffer);

    // 3. Update template document in DocuSign
    const token = await getAccessToken();
    const updateRes = await fetch(
      `${BASE_URL}/v2.1/accounts/${ACCOUNT_ID}/templates/${contract.docusignTemplateId}/documents/1`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/pdf",
          "Content-Disposition": `file; filename="${contractCode}.pdf"; documentid=1; fileExtension=pdf`,
        },
        body: new Uint8Array(pdfBuffer),
      }
    );

    if (!updateRes.ok) {
      const err = await updateRes.text();
      throw new Error(`Update template (${updateRes.status}): ${err.substring(0, 200)}`);
    }

    // 4. Reactivate PowerForm (gets deactivated after document update)
    if (contract.docusignPowerformId) {
      await reactivatePowerForm(contract.docusignPowerformId);
    }

    return NextResponse.json({
      success: true,
      data: {
        code: contractCode,
        status: "ok",
        template_id: contract.docusignTemplateId,
      },
    });
  } catch (error) {
    console.error("POST /api/push-docusign/single error:", error);
    return NextResponse.json(
      { success: false, error: `Erreur: ${error instanceof Error ? error.message : "Erreur inconnue"}` },
      { status: 500 }
    );
  }
}
