import { config } from "dotenv";
config({ path: ".env.local" });

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Seed temporaire de art_2_3.contentCourte pour tester le rendu courte durée.
 * Loïc remplacera ce contenu via l'éditeur après validation visuelle.
 *
 * Le contenu ne contient PAS les markers /pl1/ /jr1/ — ceux-ci sont injectés
 * automatiquement par docx-generator après la phrase "les périodes suivantes".
 * Loïc ne voit que du texte normal dans l'éditeur.
 */

const COURTE_TEMP_BLOCK = `- Louer le LOGEMENT, durant l'année, pendant les périodes suivantes :`;

async function main() {
  const art = await prisma.article.findUnique({ where: { code: "art_2_3" } });
  if (!art) throw new Error("art_2_3 non trouvé");
  if (art.scope !== "duree") throw new Error(`art_2_3 scope='${art.scope}', attendu 'duree' (Phase 1 non appliquée ?)`);
  if (!art.contentStandard) throw new Error("art_2_3.contentStandard est NULL");

  // Réécriture propre (sans markers) — écrase toute version précédente qui
  // contiendrait /pl1/ ou /jr1/ (le generator injecte ces markers à la volée).
  const tempContent = `${art.contentStandard.trim()}

${COURTE_TEMP_BLOCK}`;

  await prisma.article.update({
    where: { code: "art_2_3" },
    data: { contentCourte: tempContent },
  });

  const hadMarkers = art.contentCourte?.includes("/pl1/") || art.contentCourte?.includes("/jr1/");
  console.log(`art_2_3.contentCourte rempli${hadMarkers ? " (markers retirés)" : ""} — ${tempContent.length} chars`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
