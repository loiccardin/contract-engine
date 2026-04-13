import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticate } from "@/lib/auth";
import { convertDocxToPdf } from "@/lib/pdf-converter";
import { downloadFile, uploadPdf } from "@/lib/google-drive";
import { getAccessToken, reactivatePowerForm, buildTemplateBody, updateTemplateMetadata } from "@/lib/docusign";
import { google } from "googleapis";

const BASE_URL = process.env.DOCUSIGN_BASE_URL!;
const ACCOUNT_ID = process.env.DOCUSIGN_ACCOUNT_ID!;

function countPdfPages(buf: Buffer): number {
  const text = buf.toString("latin1");
  return (text.match(/\/Type\s*\/Page[^s]/g) || []).length;
}

// ─── Route handler ───

export async function POST(request: NextRequest) {
  const authError = authenticate(request);
  if (authError) return authError;

  try {
    const contracts = await prisma.contract.findMany({ orderBy: { id: "asc" } });
    const token = await getAccessToken();

    // Find the PDF folder in Drive (created by /api/generate, name contains "PDF" and "(en cours)")
    const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!;
    let pdfFolderId = rootFolderId; // fallback to root
    try {
      const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
      if (keyJson) {
        const key = JSON.parse(keyJson);
        const auth = new google.auth.GoogleAuth({ credentials: key, scopes: ["https://www.googleapis.com/auth/drive"] });
        const drive = google.drive({ version: "v3", auth });
        const folderRes = await drive.files.list({
          q: `'${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and name contains 'PDF' and name contains '(en cours)' and trashed = false`,
          fields: "files(id, name)",
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
        });
        if (folderRes.data.files?.length) {
          pdfFolderId = folderRes.data.files[0].id!;
        }
      }
    } catch { /* use root as fallback */ }

    const results: { code: string; status: string; powerform_url?: string; is_new?: boolean }[] = [];
    const errors: { code: string; error: string }[] = [];

    for (const contract of contracts) {
      try {
        if (!contract.googleDocId) {
          throw new Error("Pas de google_doc_id — lancez /api/generate d'abord");
        }

        // 1. Download DOCX from Drive
        const docxBuffer = await downloadFile(contract.googleDocId);

        // 2. Convert to PDF via LibreOffice
        const pdfBuffer = await convertDocxToPdf(docxBuffer);
        const pageCount = countPdfPages(pdfBuffer);
        const pdfBase64 = pdfBuffer.toString("base64");

        // 3. Upload PDF to Drive (in the PDF folder created by /api/generate)
        await uploadPdf(pdfFolderId, `CE - ${contract.code}`, pdfBuffer);

        if (!contract.docusignTemplateId) {
          // A) First time — create template + PowerForm
          const body = buildTemplateBody({
            code: contract.code,
            pdfBase64,
            pageCount,
            dureeType: contract.dureeType as "standard" | "courte",
          });

          const createRes = await fetch(`${BASE_URL}/v2.1/accounts/${ACCOUNT_ID}/templates`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

          if (!createRes.ok) {
            const err = await createRes.text();
            throw new Error(`Création template (${createRes.status}): ${err.substring(0, 200)}`);
          }

          const templateData = await createRes.json();
          const templateId = templateData.templateId;

          // Create PowerForm
          const pfRes = await fetch(`${BASE_URL}/v2.1/accounts/${ACCOUNT_ID}/powerforms`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              name: `CE - ${contract.code}`,
              templateId,
              signingMode: "direct",
              roles: [{ roleName: "PROPRIETAIRE", name: "", email: "" }],
            }),
          });

          if (!pfRes.ok) {
            const err = await pfRes.text();
            throw new Error(`Création PowerForm (${pfRes.status}): ${err.substring(0, 200)}`);
          }

          const pfData = await pfRes.json();
          const powerFormId = pfData.powerFormId;
          const powerFormUrl = `https://powerforms.docusign.net/${powerFormId}?env=eu&acct=${ACCOUNT_ID}&v=2`;

          // Update DB
          await prisma.contract.update({
            where: { code: contract.code },
            data: {
              docusignTemplateId: templateId,
              docusignPowerformId: powerFormId,
              docusignTemplateName: `CE - ${contract.code}`,
            },
          });

          results.push({ code: contract.code, status: "ok", powerform_url: powerFormUrl, is_new: true });
        } else {
          // B) Update — replace document in existing template
          const mimeType = "application/pdf";
          const updateRes = await fetch(
            `${BASE_URL}/v2.1/accounts/${ACCOUNT_ID}/templates/${contract.docusignTemplateId}/documents/1`,
            {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": mimeType,
                "Content-Disposition": `file; filename="${contract.code}.pdf"; documentid=1; fileExtension=pdf`,
              },
              body: new Uint8Array(pdfBuffer),
            }
          );

          if (!updateRes.ok) {
            const err = await updateRes.text();
            throw new Error(`Update template (${updateRes.status}): ${err.substring(0, 200)}`);
          }

          // Apply envelope-level metadata (locks + emailSubject corrigé)
          // — nécessaire sur les 18 templates existants créés avant le fix.
          await updateTemplateMetadata(contract.docusignTemplateId);

          // Reactivate PowerForm (gets deactivated after template document update)
          if (contract.docusignPowerformId) {
            await reactivatePowerForm(contract.docusignPowerformId);
          }

          const powerFormUrl = contract.docusignPowerformId
            ? `https://powerforms.docusign.net/${contract.docusignPowerformId}?env=eu&acct=${ACCOUNT_ID}&v=2`
            : undefined;

          results.push({ code: contract.code, status: "ok", powerform_url: powerFormUrl, is_new: false });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur inconnue";
        console.error(`Push DocuSign ${contract.code}:`, message);
        errors.push({ code: contract.code, error: message });
        results.push({ code: contract.code, status: "error" });
      }
    }

    // Insert version
    const lastVersion = await prisma.version.findFirst({ orderBy: { versionNumber: "desc" } });
    const versionNumber = (lastVersion?.versionNumber || 0) + 1;
    await prisma.version.create({ data: { versionNumber, pushedBy: "contract-engine" } });

    return NextResponse.json({
      success: true,
      data: {
        version_number: versionNumber,
        pushed_at: new Date().toISOString(),
        results,
        errors,
      },
    });
  } catch (error) {
    console.error("POST /api/push-docusign error:", error);
    return NextResponse.json(
      { success: false, error: `Erreur: ${error instanceof Error ? error.message : "Erreur inconnue"}` },
      { status: 500 }
    );
  }
}
