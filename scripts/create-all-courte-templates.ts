import { config } from "dotenv";
config({ path: ".env.local" });

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { assembleContract } from "../src/lib/contract-assembler";
import { generateDocx } from "../src/lib/docx-generator";
import { convertDocxToPdf } from "../src/lib/pdf-converter";
import { getAccessToken, buildTemplateBody } from "../src/lib/docusign";
import type { Article, Contract } from "../src/types";

const BASE_URL = process.env.DOCUSIGN_BASE_URL!;
const ACCOUNT_ID = process.env.DOCUSIGN_ACCOUNT_ID!;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function countPdfPages(buf: Buffer): number {
  const text = buf.toString("latin1");
  return (text.match(/\/Type\s*\/Page[^s]/g) || []).length;
}

async function createOne(contract: Contract, articles: Article[], token: string) {
  const code = contract.code;
  console.log(`\n=== ${code} ===`);

  if (contract.docusignTemplateId) {
    console.log(`  Skip — template déjà créé (${contract.docusignTemplateId})`);
    return { code, skipped: true };
  }

  console.log("  1. Génération DOCX…");
  const assembled = assembleContract(articles, contract);
  const docxBuffer = await generateDocx(assembled, contract);

  console.log("  2. Conversion PDF (LibreOffice)…");
  const pdfBuffer = await convertDocxToPdf(docxBuffer);
  const pageCount = countPdfPages(pdfBuffer);
  const pdfBase64 = pdfBuffer.toString("base64");
  console.log(`     ${pageCount} pages, ${(pdfBuffer.length / 1024).toFixed(0)} KB`);

  console.log("  3. Création template DocuSign…");
  const body = buildTemplateBody({
    code,
    pdfBase64,
    pageCount,
    dureeType: contract.dureeType as "standard" | "courte",
  });

  const tplRes = await fetch(`${BASE_URL}/v2.1/accounts/${ACCOUNT_ID}/templates`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!tplRes.ok) throw new Error(`Template ${code} (${tplRes.status}): ${(await tplRes.text()).slice(0, 300)}`);
  const templateId = (await tplRes.json()).templateId as string;
  console.log(`     Template ID: ${templateId}`);

  console.log("  4. Création PowerForm…");
  const pfRes = await fetch(`${BASE_URL}/v2.1/accounts/${ACCOUNT_ID}/powerforms`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `CE - ${code}`,
      templateId,
      signingMode: "direct",
      roles: [{ roleName: "PROPRIETAIRE", name: "", email: "" }],
    }),
  });
  if (!pfRes.ok) throw new Error(`PowerForm ${code} (${pfRes.status}): ${(await pfRes.text()).slice(0, 300)}`);
  const powerFormId = (await pfRes.json()).powerFormId as string;
  const powerFormUrl = `https://powerforms.docusign.net/${powerFormId}?env=eu&acct=${ACCOUNT_ID}&v=2`;
  console.log(`     PowerForm ID: ${powerFormId}`);
  console.log(`     URL: ${powerFormUrl}`);

  console.log("  5. Sauvegarde DB…");
  await prisma.contract.update({
    where: { code },
    data: {
      docusignTemplateId: templateId,
      docusignPowerformId: powerFormId,
      docusignTemplateName: `CE - ${code}`,
    },
  });

  return { code, templateId, powerFormId, powerFormUrl };
}

async function main() {
  const onlyCode = process.argv[2];
  const where = onlyCode ? { code: onlyCode } : { dureeType: "courte" };
  const contracts = await prisma.contract.findMany({ where, orderBy: { code: "asc" } });

  if (contracts.length === 0) {
    console.error(onlyCode ? `Contrat ${onlyCode} introuvable.` : "Aucun contrat courte durée en DB.");
    process.exit(1);
  }
  if (onlyCode && (contracts[0] as unknown as Contract).dureeType !== "courte") {
    console.warn(`⚠ ${onlyCode} n'est pas courte durée (dureeType=${(contracts[0] as unknown as Contract).dureeType}) — création quand même.`);
  }

  console.log(`Traitement de ${contracts.length} contrat(s): ${contracts.map(c => c.code).join(", ")}`);

  const articles = (await prisma.article.findMany({ orderBy: { orderIndex: "asc" } })) as unknown as Article[];
  const token = await getAccessToken();

  const results = [];
  for (const c of contracts) {
    try {
      results.push(await createOne(c as unknown as Contract, articles, token));
    } catch (e) {
      console.error(`  ✗ ${c.code}:`, e instanceof Error ? e.message : e);
      results.push({ code: c.code, error: e instanceof Error ? e.message : String(e) });
    }
  }

  console.log("\n=== RÉCAP ===");
  for (const r of results) {
    if ("skipped" in r) console.log(`  ${r.code}: SKIP (déjà existant)`);
    else if ("error" in r) console.log(`  ${r.code}: ERROR — ${r.error}`);
    else console.log(`  ${r.code}: OK — template=${r.templateId}, pf=${r.powerFormId}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
