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

async function deleteTemplate(token: string, templateId: string) {
  try {
    await fetch(`${BASE_URL}/v2.1/accounts/${ACCOUNT_ID}/templates/${templateId}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`   Supprimé: ${templateId}`);
  } catch { console.log(`   Ignoré: ${templateId}`); }
}

async function main() {
  const code = process.argv[2] || "P1.P.CJ";
  console.log(`=== Création template DocuSign V3 — ${code} ===\n`);

  const token = await getAccessToken();

  // 0. Clean up old test templates
  console.log("0. Nettoyage anciens templates...");
  await deleteTemplate(token, "038b7c11-863e-4a1f-889d-0b6982e0f7aa"); // V1
  await deleteTemplate(token, "146808bb-54cd-43ef-8638-8e49abc6f213"); // V2
  await deleteTemplate(token, "0ce7705d-3429-492c-b864-c5fd24594940"); // V3
  await deleteTemplate(token, "f30c3907-e667-40c9-8607-3c2d3a6f637d"); // V4
  await deleteTemplate(token, "e0ab5ef9-317c-4a32-b58f-1920de5fe548"); // V5
  await deleteTemplate(token, "84df7c6b-98db-4df9-bb49-3b894776da38"); // V6

  // 1. Generate DOCX → PDF
  console.log("\n1. Génération DOCX...");
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

  // Common properties matching prod template
  const common = {
    locked: "false",
    disableAutoSize: "false",
    concealValueOnDocument: "false",
    maxLength: "4000",
    shared: "false",
    requireInitialOnSharedChange: "false",
    requireAll: "false",
  };
  const s9 = { font: "lucidaconsole", fontSize: "size9", fontColor: "black", bold: "false", italic: "false", underline: "false" };
  const s8 = { font: "lucidaconsole", fontSize: "size8", fontColor: "black", bold: "false", italic: "false", underline: "false" };
  const a0 = { anchorXOffset: "0", anchorYOffset: "0", anchorUnits: "pixels" };

  const isCourteDuree = (contract as unknown as Contract).dureeType === "courte";

  const courteDureeTabs = isCourteDuree
    ? [
        // Article 2.3 courte durée — rectangle plages de location
        {
          anchorString: "/pl1/", anchorXOffset: "0", anchorYOffset: "5", anchorUnits: "pixels",
          ...s9, ...common,
          tabLabel: "plages_location",
          value: "A compléter par les plages durant lesquelles le LOGEMENT sera disponible à la location",
          required: "true", width: 520, height: 35,
        },
        // Article 2.3 courte durée — nombre de jours (inline)
        {
          anchorString: "/jr1/", ...a0,
          ...s9, ...common,
          tabLabel: "nombre_jours",
          value: "",
          required: "true", width: 80, height: 16,
        },
      ]
    : [];

  const textTabs = [
    ...courteDureeTabs,
    // Page 1 — formulaire propriétaire
    { anchorString: "/nm1/", ...a0, ...s9, ...common, tabLabel: "nom_prenoms", value: "Nom et Prénoms", required: "true", width: 365, height: 16 },
    { anchorString: "/ss1/", ...a0, ...s9, ...common, tabLabel: "siege_social", value: "Adresse postale complète du siège social", required: "true", width: 391, height: 16 },
    { anchorString: "/dn1/", ...a0, ...s9, ...common, tabLabel: "date_naissance", value: "JJ/MM/AAAA", required: "true", width: 241, height: 16 },
    { anchorString: "/ad1/", ...a0, ...s9, ...common, tabLabel: "adresse_domicile", value: "Adresse postale complète personnelle", required: "true", width: 391, height: 16 },
    { anchorString: "/py1/", ...a0, ...s9, ...common, tabLabel: "pays", value: "France / autre", required: "true", width: 241, height: 17 },
    { anchorString: "/tl1/", ...a0, ...s9, ...common, tabLabel: "telephone", value: "Numéro de téléphone", required: "true", width: 206, height: 17 },
    { anchorString: "/ml1/", ...a0, ...s9, ...common, tabLabel: "mail", value: "adresse mail", required: "true", width: 347, height: 18 },
    // Logement page 1 — marker on its own line below
    { anchorString: "/lg1/", ...a0, ...s9, ...common, tabLabel: "adresse_logement", value: "Adresse du ou des biens exploités en LCD", required: "true", width: 563, height: 35 },
    // Logement page 2
    { anchorString: "/lg2/", anchorXOffset: "0", anchorYOffset: "5", anchorUnits: "pixels", ...s9, ...common, tabLabel: "adresse_logement_2", value: "Adresse du ou des biens exploités en LCD", required: "true", width: 520, height: 35 },
    // Article 9 — commentaires (offset into the box)
    { anchorString: "/cm1/", anchorXOffset: "10", anchorYOffset: "10", anchorUnits: "pixels", ...s9, ...common, tabLabel: "commentaires", value: "", required: "false", width: 480, height: 80 },
    // Page signature — ville
    { anchorString: "fait à", anchorXOffset: "30", anchorYOffset: "0", anchorUnits: "pixels", ...s8, ...common, tabLabel: "ville", value: "Ville", required: "true", width: 122, height: 15 },
    // Bon pour accord (15px above signature /sn1/)
    { anchorString: "/sn1/", anchorXOffset: "0", anchorYOffset: "0", anchorUnits: "pixels", ...s8, ...common, tabLabel: "bon_pour_accord", value: "Bon pour accord", required: "true", width: 161, height: 16 },
    // Date (textTab éditable, le signataire écrit la date)
    { anchorString: "originaux le", anchorXOffset: "70", anchorYOffset: "0", anchorUnits: "pixels", ...s8, ...common, tabLabel: "date_signature", value: "Date", required: "true", width: 150, height: 15 },
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
            anchorString: "/sn1/", anchorXOffset: "0", anchorYOffset: "65", anchorUnits: "pixels",
            scaleValue: "1.25", tabLabel: "signature_proprietaire",
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

  // 4. Create PowerForm (direct signing, no email code)
  console.log("\n4. Création du PowerForm...");
  const pfRes = await fetch(`${BASE_URL}/v2.1/accounts/${ACCOUNT_ID}/powerforms`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `${code} - Promesse contrat de conciergerie`,
      templateId,
      signingMode: "direct",
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

  console.log(`\n=== RÉSULTAT ===`);
  console.log(`Template ID   : ${templateId}`);
  console.log(`Template Name : ${code} - Promesse contrat de conciergerie`);
  console.log(`Dashboard     : https://apps-d.docusign.com/templates/details/${templateId}`);
  console.log(`PowerForm ID  : ${powerFormId}`);
  console.log(`PowerForm URL : ${powerFormUrl}`);
  console.log(`\nTabs : ${textTabs.length} text, 1 sign, ${initialHereTabs.length} initials`);
  console.log(`\n✓ Template + PowerForm V3 créés !`);
}

main()
  .catch((e) => { console.error("\n✗ Erreur:", e.message); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
