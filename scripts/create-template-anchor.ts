import { config } from "dotenv";
config({ path: ".env.local" });

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { assembleContract } from "../src/lib/contract-assembler";
import { generateDocx } from "../src/lib/docx-generator";
import { convertDocxToPdf } from "../src/lib/pdf-converter";
import { getAccessToken } from "../src/lib/docusign";
import { Article, Contract } from "../src/types";

const BASE_URL = process.env.DOCUSIGN_BASE_URL!;
const ACCOUNT_ID = process.env.DOCUSIGN_ACCOUNT_ID!;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function countPdfPages(pdfBuffer: Buffer): number {
  const text = pdfBuffer.toString("latin1");
  const matches = text.match(/\/Type\s*\/Page[^s]/g);
  return matches ? matches.length : 0;
}

async function main() {
  const code = "P1.P.CJ";
  console.log(`=== Création template DocuSign V2 — ${code} ===\n`);

  // 1. Generate DOCX → PDF
  console.log("1. Génération DOCX...");
  const articles = await prisma.article.findMany({ orderBy: { orderIndex: "asc" } });
  const contract = await prisma.contract.findUnique({ where: { code } });
  if (!contract) throw new Error(`Contrat ${code} non trouvé`);

  const assembled = assembleContract(articles as unknown as Article[], contract as unknown as Contract);
  const docxBuffer = await generateDocx(assembled, contract as unknown as Contract);
  console.log(`   DOCX: ${(docxBuffer.length / 1024).toFixed(0)} KB`);

  console.log("2. Conversion PDF...");
  const pdfBuffer = await convertDocxToPdf(docxBuffer);
  const pageCount = countPdfPages(pdfBuffer);
  console.log(`   PDF: ${(pdfBuffer.length / 1024).toFixed(0)} KB, ${pageCount} pages`);

  const documentBase64 = pdfBuffer.toString("base64");

  // Initials on every page (absolute position like prod)
  const initialHereTabs = Array.from({ length: pageCount }, (_, i) => ({
    name: "InitialHere",
    tabLabel: `paraphe_page_${i + 1}`,
    scaleValue: "1",
    optional: "false",
    documentId: "1",
    pageNumber: String(i + 1),
    xPosition: "72",
    yPosition: "775",
  }));

  // Common tab properties
  const s9 = { font: "lucidaconsole", fontSize: "size9", fontColor: "black", bold: "false", italic: "false", underline: "false" };
  const s8 = { font: "lucidaconsole", fontSize: "size8", fontColor: "black", bold: "false", italic: "false", underline: "false" };
  const a0 = { anchorXOffset: "0", anchorYOffset: "0", anchorUnits: "pixels" };

  const textTabs = [
    // Page 1 — formulaire propriétaire
    { anchorString: "/nm1/", ...a0, ...s9, tabLabel: "nom_prenoms", value: "Nom et Prénoms", required: "true", width: 365, height: 16 },
    { anchorString: "/ss1/", ...a0, ...s9, tabLabel: "siege_social", value: "Adresse postale complète du siège social", required: "true", width: 391, height: 16 },
    { anchorString: "/dn1/", ...a0, ...s9, tabLabel: "date_naissance", value: "JJ/MM/AAAA", required: "true", width: 241, height: 16 },
    { anchorString: "/ad1/", ...a0, ...s9, tabLabel: "adresse_domicile", value: "Adresse postale complète personnelle", required: "true", width: 391, height: 16 },
    { anchorString: "/py1/", ...a0, ...s9, tabLabel: "pays", value: "France / autre", required: "true", width: 241, height: 17 },
    { anchorString: "/tl1/", ...a0, ...s9, tabLabel: "telephone", value: "Numéro de téléphone", required: "true", width: 206, height: 17 },
    { anchorString: "/ml1/", ...a0, ...s9, tabLabel: "mail", value: "adresse mail", required: "true", width: 347, height: 18 },
    { anchorString: "/lg1/", ...a0, ...s9, tabLabel: "adresse_logement", value: "Adresse du ou des biens exploités en LCD", required: "true", width: 563, height: 35 },
    // Page 2 — logement (2ème occurrence)
    { anchorString: "/lg2/", ...a0, ...s9, tabLabel: "adresse_logement_2", value: "Adresse du ou des biens exploités en LCD", required: "true", width: 522, height: 54 },
    // Article 9 — commentaires (décalé dans la boîte)
    { anchorString: "/cm1/", anchorXOffset: "0", anchorYOffset: "5", anchorUnits: "pixels", ...s9, tabLabel: "commentaires", value: "", required: "false", width: 400, height: 60 },
    // Page signature
    { anchorString: "/vi1/", ...a0, ...s8, tabLabel: "ville", value: "Ville", required: "true", width: 122, height: 15 },
    // Bon pour accord (au-dessus de la signature)
    { anchorString: "/sn1/", anchorXOffset: "0", anchorYOffset: "-20", anchorUnits: "pixels", ...s8, tabLabel: "bon_pour_accord", value: "Bon pour accord", required: "true", width: 161, height: 16 },
  ];

  const body = {
    name: `${code} - Promesse contrat de conciergerie`,
    description: `Contract Engine — ${code}`,
    emailSubject: "Contrat de conciergerie — Signature requise",
    documents: [{ documentBase64, name: `${code}.pdf`, fileExtension: "pdf", documentId: "1" }],
    recipients: {
      signers: [{
        roleName: "PROPRIETAIRE",
        recipientId: "1",
        routingOrder: "1",
        requireIdLookup: "false",
        tabs: {
          textTabs,
          signHereTabs: [{
            anchorString: "/sn1/", ...a0,
            scaleValue: "1.25", tabLabel: "signature_proprietaire",
          }],
          dateSignedTabs: [{
            anchorString: "/dt1/", ...a0,
            ...s8, tabLabel: "date_signature",
          }],
          initialHereTabs,
        },
      }],
      carbonCopies: [{
        roleName: "LETAHOST LLC",
        recipientId: "2",
        routingOrder: "2",
        name: "Loïc CARDIN",
        email: "direction@conciergerie-letahost.com",
        templateLocked: "true",
        templateRequired: "true",
      }],
    },
    status: "created",
  };

  // 3. Create template
  console.log("\n3. Création du template DocuSign...");
  const token = await getAccessToken();
  const res = await fetch(`${BASE_URL}/v2.1/accounts/${ACCOUNT_ID}/templates`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Création template échouée (${res.status}): ${err}`);
  }

  const data = await res.json();
  const templateId = data.templateId;
  console.log(`   Template ID: ${templateId}`);

  // 4. Create PowerForm
  console.log("\n4. Création du PowerForm...");
  const pfRes = await fetch(`${BASE_URL}/v2.1/accounts/${ACCOUNT_ID}/powerforms`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `${code} - Promesse contrat de conciergerie`,
      templateId,
      signingMode: "email",
      roles: [{ roleName: "PROPRIETAIRE", name: "", email: "" }],
    }),
  });

  if (!pfRes.ok) {
    const err = await pfRes.text();
    throw new Error(`Création PowerForm échouée (${pfRes.status}): ${err}`);
  }

  const pfData = await pfRes.json();
  const powerFormId = pfData.powerFormId;
  const powerFormUrl = `https://powerforms.docusign.net/${powerFormId}?env=eu&acct=${ACCOUNT_ID}&v=2`;

  // Summary
  console.log(`\n=== RÉSULTAT ===`);
  console.log(`Template ID   : ${templateId}`);
  console.log(`Template Name : ${code} - Promesse contrat de conciergerie`);
  console.log(`Dashboard     : https://apps-d.docusign.com/templates/details/${templateId}`);
  console.log(`PowerForm ID  : ${powerFormId}`);
  console.log(`PowerForm URL : ${powerFormUrl}`);
  console.log(`\nTabs : ${textTabs.length} text, 1 sign, 1 date, ${initialHereTabs.length} initials`);
  console.log(`\n✓ Template + PowerForm créés avec succès !`);
}

main()
  .catch((e) => { console.error("\n✗ Erreur:", e.message); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
