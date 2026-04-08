import { config } from "dotenv";
config({ path: ".env.local" });

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { assembleContract } from "../src/lib/contract-assembler";
import { generateDocx } from "../src/lib/docx-generator";
import { createTemplateWithDocument, createPowerForm } from "../src/lib/docusign";
import { convertDocxToPdf } from "../src/lib/pdf-converter";
import { Article, Contract } from "../src/types";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const code = "P1.P.CJ";
  console.log(`=== Création template DocuSign pour ${code} ===\n`);

  // 1. Générer le DOCX
  console.log("1. Génération du DOCX...");
  const articles = await prisma.article.findMany({ orderBy: { orderIndex: "asc" } });
  const contract = await prisma.contract.findUnique({ where: { code } });
  if (!contract) throw new Error(`Contrat ${code} non trouvé en DB`);

  const assembled = assembleContract(
    articles as unknown as Article[],
    contract as unknown as Contract
  );
  const docxBuffer = await generateDocx(assembled, contract as unknown as Contract);
  console.log(`   DOCX : ${docxBuffer.length} bytes, ${assembled.length} articles`);

  // 2. Convertir en PDF via LibreOffice
  console.log("\n2. Conversion DOCX → PDF via LibreOffice...");
  const pdfBuffer = await convertDocxToPdf(docxBuffer);
  console.log(`   PDF : ${pdfBuffer.length} bytes`);

  // 3. Créer le template DocuSign avec le PDF
  console.log("\n3. Création du template DocuSign...");
  const templateId = await createTemplateWithDocument(code, pdfBuffer, `${code}.pdf`, "pdf");
  console.log(`   Template créé : ${templateId}`);

  // 4. Créer le PowerForm
  console.log("\n4. Création du PowerForm...");
  const { powerFormId, powerFormUrl } = await createPowerForm(templateId, code);
  console.log(`   PowerForm ID : ${powerFormId}`);
  console.log(`   PowerForm URL : ${powerFormUrl}`);

  // 5. Mettre à jour la DB
  console.log("\n5. Mise à jour de la DB...");
  await prisma.contract.update({
    where: { code },
    data: {
      docusignTemplateId: templateId,
      docusignPowerformId: powerFormId,
      docusignTemplateName: `CE - ${code}`,
    },
  });
  console.log("   DB mise à jour ✓");

  // 6. Résumé
  console.log("\n=== RÉSUMÉ ===");
  console.log(`Contrat       : ${code}`);
  console.log(`Template ID   : ${templateId}`);
  console.log(`Template Name : CE - ${code}`);
  console.log(`PowerForm ID  : ${powerFormId}`);
  console.log(`PowerForm URL : ${powerFormUrl}`);
  console.log("\n✓ Template DocuSign créé avec succès !");
}

main()
  .catch((e) => {
    console.error("\n✗ Erreur:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
