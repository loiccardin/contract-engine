import { config } from "dotenv";
config({ path: ".env.local" });

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

/**
 * art_2_10 (Sous-traitance) est remplacé dans le contrat par art_legislation_sociale
 * (contrat_only). Sans ce tag, les deux articles cohabiteraient lors de la
 * génération d'un contrat — duplication.
 */
async function main() {
  const a = await prisma.article.findUnique({ where: { code: "art_2_10" } });
  if (!a) { console.error("✗ art_2_10 introuvable"); process.exit(1); }

  await prisma.article.update({
    where: { code: "art_2_10" },
    data: { documentType: "promesse_only" },
  });
  console.log(`✓ art_2_10 (${a.title}) → promesse_only`);

  const counts = await prisma.article.groupBy({ by: ["documentType"], _count: true });
  console.log("\nRépartition document_type:");
  for (const c of counts.sort((x, y) => x.documentType.localeCompare(y.documentType))) {
    console.log(`  ${c.documentType.padEnd(15)} ${c._count}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
