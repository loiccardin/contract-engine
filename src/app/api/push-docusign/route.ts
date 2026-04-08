import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticate } from "@/lib/auth";
import { convertDocxToPdf } from "@/lib/pdf-converter";
import { downloadFile, uploadPdf } from "@/lib/google-drive";
import { getAccessToken, reactivatePowerForm } from "@/lib/docusign";
import { google } from "googleapis";

const BASE_URL = process.env.DOCUSIGN_BASE_URL!;
const ACCOUNT_ID = process.env.DOCUSIGN_ACCOUNT_ID!;

// ─── Anchor tabs config (V7) ───

function countPdfPages(buf: Buffer): number {
  const text = buf.toString("latin1");
  return (text.match(/\/Type\s*\/Page[^s]/g) || []).length;
}

function buildTemplateBody(code: string, pdfBase64: string, pageCount: number) {
  const common = {
    locked: "false", disableAutoSize: "false", concealValueOnDocument: "false",
    maxLength: "4000", shared: "false", requireInitialOnSharedChange: "false", requireAll: "false",
  };
  const s9 = { font: "lucidaconsole", fontSize: "size9", fontColor: "black", bold: "false", italic: "false", underline: "false" };
  const s8 = { font: "lucidaconsole", fontSize: "size8", fontColor: "black", bold: "false", italic: "false", underline: "false" };
  const a0 = { anchorXOffset: "0", anchorYOffset: "0", anchorUnits: "pixels" };

  const textTabs: Record<string, unknown>[] = [
    { anchorString: "/nm1/", ...a0, ...s9, ...common, tabLabel: "nom_prenoms", value: "Nom et Prénoms", required: "true", width: 365, height: 16 },
    { anchorString: "/ss1/", ...a0, ...s9, ...common, tabLabel: "siege_social", value: "Adresse postale complète du siège social", required: "true", width: 391, height: 16 },
    { anchorString: "/dn1/", ...a0, ...s9, ...common, tabLabel: "date_naissance", value: "JJ/MM/AAAA", required: "true", width: 241, height: 16 },
    { anchorString: "/ad1/", ...a0, ...s9, ...common, tabLabel: "adresse_domicile", value: "Adresse postale complète personnelle", required: "true", width: 391, height: 16 },
    { anchorString: "/py1/", ...a0, ...s9, ...common, tabLabel: "pays", value: "France / autre", required: "true", width: 241, height: 17 },
    { anchorString: "/tl1/", ...a0, ...s9, ...common, tabLabel: "telephone", value: "Numéro de téléphone", required: "true", width: 206, height: 17 },
    { anchorString: "/ml1/", ...a0, ...s9, ...common, tabLabel: "mail", value: "adresse mail", required: "true", width: 347, height: 18 },
    { anchorString: "/lg1/", ...a0, ...s9, ...common, tabLabel: "adresse_logement", value: "Adresse du ou des biens exploités en LCD", required: "true", width: 563, height: 35 },
    { anchorString: "/lg2/", anchorXOffset: "0", anchorYOffset: "5", anchorUnits: "pixels", ...s9, ...common, tabLabel: "adresse_logement_2", value: "Adresse du ou des biens exploités en LCD", required: "true", width: 520, height: 35 },
    { anchorString: "/cm1/", anchorXOffset: "10", anchorYOffset: "10", anchorUnits: "pixels", ...s9, ...common, tabLabel: "commentaires", value: "", required: "false", width: 480, height: 80 },
    { anchorString: "fait à", anchorXOffset: "30", anchorYOffset: "0", anchorUnits: "pixels", ...s8, ...common, tabLabel: "ville", value: "Ville", required: "true", width: 122, height: 15 },
    { anchorString: "/sn1/", anchorXOffset: "0", anchorYOffset: "0", anchorUnits: "pixels", ...s8, ...common, tabLabel: "bon_pour_accord", value: "Bon pour accord", required: "true", width: 161, height: 16 },
    { anchorString: "originaux le", anchorXOffset: "70", anchorYOffset: "0", anchorUnits: "pixels", ...s8, ...common, tabLabel: "date_signature", value: "Date", required: "true", width: 150, height: 15 },
  ];

  if (code.includes(".S")) {
    textTabs.push({
      anchorString: "/sr1/", ...a0, ...s9, ...common,
      tabLabel: "siren", value: "Numéro SIREN", required: "true", width: 150, height: 15,
    });
  }

  const initialHereTabs = Array.from({ length: pageCount }, (_, i) => ({
    name: "InitialHere", tabLabel: `paraphe_page_${i + 1}`, scaleValue: "1",
    optional: "false", documentId: "1", pageNumber: String(i + 1),
    xPosition: "72", yPosition: "775",
  }));

  return {
    name: `CE - ${code}`,
    description: `Contract Engine — ${code}`,
    emailSubject: "Contrat de conciergerie — Signature requise",
    documents: [{ documentBase64: pdfBase64, name: `${code}.pdf`, fileExtension: "pdf", documentId: "1" }],
    recipients: {
      signers: [{
        roleName: "PROPRIETAIRE", recipientId: "1", routingOrder: "1", requireIdLookup: "false",
        tabs: {
          textTabs,
          signHereTabs: [{ anchorString: "/sn1/", anchorXOffset: "0", anchorYOffset: "65", anchorUnits: "pixels", scaleValue: "1.25", tabLabel: "signature_proprietaire" }],
          initialHereTabs,
        },
      }],
      carbonCopies: [{
        roleName: "LETAHOST LLC", recipientId: "2", routingOrder: "2",
        name: "Loïc CARDIN", email: "direction@conciergerie-letahost.com",
        templateLocked: "true", templateRequired: "true",
      }],
    },
    status: "created",
  };
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
          const body = buildTemplateBody(contract.code, pdfBase64, pageCount);

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
