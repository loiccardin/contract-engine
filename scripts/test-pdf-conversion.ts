import { config } from "dotenv";
config({ path: ".env.local" });

import * as fs from "fs";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { assembleContract } from "../src/lib/contract-assembler";
import { generateDocx } from "../src/lib/docx-generator";
import { convertDocxToPdf } from "../src/lib/pdf-converter";
import { Article, Contract } from "../src/types";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const code = "P1.P.CJ";
  console.log(`=== Test conversion DOCX → PDF pour ${code} ===\n`);

  // 1. Générer le DOCX
  console.log("1. Génération du DOCX...");
  const articles = await prisma.article.findMany({ orderBy: { orderIndex: "asc" } });
  const contract = await prisma.contract.findUnique({ where: { code } });
  if (!contract) throw new Error(`Contrat ${code} non trouvé`);

  const assembled = assembleContract(
    articles as unknown as Article[],
    contract as unknown as Contract
  );
  const docxBuffer = await generateDocx(assembled, contract as unknown as Contract);
  console.log(`   DOCX : ${docxBuffer.length} bytes (${(docxBuffer.length / 1024).toFixed(0)} KB)`);

  // 2. Convertir en PDF
  console.log("\n2. Conversion DOCX → PDF via LibreOffice...");
  const start = Date.now();
  const pdfBuffer = await convertDocxToPdf(docxBuffer);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`   PDF : ${pdfBuffer.length} bytes (${(pdfBuffer.length / 1024).toFixed(0)} KB)`);
  console.log(`   Durée : ${elapsed}s`);

  // 3. Sauvegarder
  const outPath = `/tmp/test-${code}.pdf`;
  fs.writeFileSync(outPath, pdfBuffer);
  console.log(`\n3. PDF sauvegardé : ${outPath}`);

  console.log("\n✓ Conversion OK !");
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
