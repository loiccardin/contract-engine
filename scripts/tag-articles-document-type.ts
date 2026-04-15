import { config } from "dotenv";
config({ path: ".env.local" });

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

/**
 * Étiquette les 12 articles "promesse_only" :
 *  - 9 articles supprimés du contrat (rétractation, durée Promesse, Art 4 confidentialité,
 *    intégralité, litige, signature électronique)
 *  - 3 articles remplacés par une version contrat différente (en-tête prestataire,
 *    consentement → objet, indépendance des stipulations → nullité)
 *
 * STOP si un code n'existe pas en DB — on n'invente jamais.
 */
const PROMESSE_ONLY_CODES = [
  // A) Supprimés dans le contrat
  "art_1_2",
  "art_1_3",
  "art_1_4",
  "art_3_1",
  "art_3_2",
  "art_4",
  "art_6",
  "art_7", // fusionné dans Art 13 du contrat
  "art_8", // fusionné dans Art 13 du contrat
  // B) Remplacés par une version contrat différente
  "en_tete_prestataire",
  "art_1_1",
  "art_5",
];

async function main() {
  // 1. Vérifier que tous les codes existent
  const existing = await prisma.article.findMany({
    where: { code: { in: PROMESSE_ONLY_CODES } },
    select: { code: true, title: true, documentType: true },
  });
  const existingCodes = new Set(existing.map((a) => a.code));
  const missing = PROMESSE_ONLY_CODES.filter((c) => !existingCodes.has(c));
  if (missing.length > 0) {
    console.error(`✗ Codes introuvables en DB: ${missing.join(", ")}`);
    process.exit(1);
  }

  console.log(`✓ ${existing.length}/${PROMESSE_ONLY_CODES.length} codes trouvés en DB`);

  // 2. Update document_type
  let updated = 0;
  for (const code of PROMESSE_ONLY_CODES) {
    const res = await prisma.article.update({
      where: { code },
      data: { documentType: "promesse_only" },
    });
    console.log(`  ${code.padEnd(28)} → promesse_only (${res.title})`);
    updated++;
  }

  console.log(`\n✓ ${updated} articles taggés promesse_only`);

  const counts = await prisma.article.groupBy({
    by: ["documentType"],
    _count: true,
  });
  console.log("\nRépartition document_type:");
  for (const c of counts) console.log(`  ${c.documentType.padEnd(15)} ${c._count}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
