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
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

/**
 * Génère localement un ou plusieurs contrats DOCX dans ./output/
 * Usage:
 *   npx tsx scripts/test-generate-contrat.ts            (les 3 variantes du brief)
 *   npx tsx scripts/test-generate-contrat.ts C1.P.CJ    (un seul)
 */
async function main() {
  const onlyCode = process.argv[2];
  const codes = onlyCode ? [onlyCode] : ["C1.P.CJ", "C3.S.R", "C6.P"];

  const articles = (await prisma.article.findMany({ orderBy: { orderIndex: "asc" } })) as unknown as Article[];

  const outDir = path.join(process.cwd(), "output");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  for (const code of codes) {
    const c = await prisma.contract.findUnique({ where: { code } });
    if (!c) { console.error(`✗ ${code} introuvable`); continue; }
    const assembled = assembleContract(articles, c as unknown as Contract, "contrat");
    const buffer = await generateDocx(assembled, c as unknown as Contract, "contrat");
    const out = path.join(outDir, `${code}.docx`);
    fs.writeFileSync(out, buffer);
    console.log(`✓ ${out} (${(buffer.length / 1024).toFixed(0)} KB, ${assembled.length} articles)`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
