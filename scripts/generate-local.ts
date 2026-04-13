import { config } from "dotenv";
config({ path: ".env.local" });

import * as fs from "fs";
import * as path from "path";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { assembleContract } from "../src/lib/contract-assembler";
import { generateDocx } from "../src/lib/docx-generator";
import type { Article, Contract } from "../src/types";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const code = process.argv[2];
  if (!code) {
    console.error("Usage: npx tsx scripts/generate-local.ts <CODE>");
    console.error("Exemple: npx tsx scripts/generate-local.ts P7.P.CJ");
    process.exit(1);
  }

  const contract = await prisma.contract.findUnique({ where: { code } });
  if (!contract) throw new Error(`Contrat ${code} introuvable`);

  const articles = await prisma.article.findMany({ orderBy: { orderIndex: "asc" } });

  const assembled = assembleContract(articles as unknown as Article[], contract as unknown as Contract);
  const buffer = await generateDocx(assembled, contract as unknown as Contract);

  const outDir = path.join(process.cwd(), "output");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${code}.docx`);
  fs.writeFileSync(outPath, buffer);

  console.log(`✓ ${outPath} (${(buffer.length / 1024).toFixed(0)} KB, ${assembled.length} articles)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
