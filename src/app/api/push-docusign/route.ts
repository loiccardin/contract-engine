import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticate } from "@/lib/auth";
import { convertDocxToPdf } from "@/lib/pdf-converter";
import { downloadFile } from "@/lib/google-drive";
import {
  getAccessToken,
  createTemplateWithDocument,
  updateTemplateDocument,
  createPowerForm,
} from "@/lib/docusign";

// ─── Anchor tabs config (V7 — validated) ───

function countPdfPages(pdfBuffer: Buffer): number {
  const text = pdfBuffer.toString("latin1");
  const matches = text.match(/\/Type\s*\/Page[^s]/g);
  return matches ? matches.length : 0;
}

function buildTabsConfig(contractCode: string, pageCount: number) {
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

  // Add SIREN tab for société variants (.S)
  if (contractCode.includes(".S")) {
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
    textTabs,
    signHereTabs: [{
      anchorString: "/sn1/", anchorXOffset: "0", anchorYOffset: "65", anchorUnits: "pixels",
      scaleValue: "1.25", tabLabel: "signature_proprietaire",
    }],
    initialHereTabs,
  };
}

// ─── Route handler ───

export async function POST(request: NextRequest) {
  const authError = authenticate(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const description = body.description as string;
    if (!description) {
      return NextResponse.json({ success: false, error: "Le champ 'description' est requis" }, { status: 400 });
    }

    const contracts = await prisma.contract.findMany({ orderBy: { id: "asc" } });
    const token = await getAccessToken();
    void token; // used indirectly via docusign.ts functions

    const results: { code: string; status: string; template_id?: string; powerform_url?: string }[] = [];
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

        const templateName = `CE - ${contract.code}`;

        if (!contract.docusignTemplateId) {
          // A) First time — create template + PowerForm
          const templateId = await createTemplateWithDocument(
            contract.code, pdfBuffer, `${contract.code}.pdf`, "pdf"
          );

          // Update template tabs via the tabs config
          // The createTemplateWithDocument function in docusign.ts already handles basic tabs
          // But we need to apply V7 tabs — we do this by updating the recipient tabs
          const tabs = buildTabsConfig(contract.code, pageCount);
          const baseUrl = process.env.DOCUSIGN_BASE_URL!;
          const accountId = process.env.DOCUSIGN_ACCOUNT_ID!;
          const accessToken = await getAccessToken();

          // Get the recipient ID from the template
          const recipRes = await fetch(
            `${baseUrl}/v2.1/accounts/${accountId}/templates/${templateId}/recipients`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          const recipData = await recipRes.json();
          const signerId = recipData.signers?.[0]?.recipientId;

          if (signerId) {
            // Update tabs with V7 config
            await fetch(
              `${baseUrl}/v2.1/accounts/${accountId}/templates/${templateId}/recipients/${signerId}/tabs`,
              {
                method: "PUT",
                headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
                body: JSON.stringify(tabs),
              }
            );
          }

          // Create PowerForm
          const { powerFormId } = await createPowerForm(templateId, contract.code);
          const powerFormUrl = `https://powerforms.docusign.net/${powerFormId}?env=eu&acct=${accountId}&v=2`;

          // Update DB
          await prisma.contract.update({
            where: { code: contract.code },
            data: {
              docusignTemplateId: templateId,
              docusignPowerformId: powerFormId,
              docusignTemplateName: templateName,
            },
          });

          results.push({ code: contract.code, status: "ok", template_id: templateId, powerform_url: powerFormUrl });
        } else {
          // B) Update — replace document in existing template
          await updateTemplateDocument(
            contract.docusignTemplateId, pdfBuffer, `${contract.code}.pdf`, "pdf"
          );

          const powerFormUrl = contract.docusignPowerformId
            ? `https://powerforms.docusign.net/${contract.docusignPowerformId}?env=eu&acct=${process.env.DOCUSIGN_ACCOUNT_ID}&v=2`
            : undefined;

          results.push({ code: contract.code, status: "ok", template_id: contract.docusignTemplateId, powerform_url: powerFormUrl });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur inconnue";
        console.error(`Push DocuSign ${contract.code}:`, message);
        errors.push({ code: contract.code, error: message });
        results.push({ code: contract.code, status: "error" });
      }
    }

    // Insert version record
    const lastVersion = await prisma.version.findFirst({ orderBy: { versionNumber: "desc" } });
    const versionNumber = (lastVersion?.versionNumber || 0) + 1;

    await prisma.version.create({
      data: {
        versionNumber,
        description,
        pushedBy: "contract-engine",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        version_number: versionNumber,
        description,
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
