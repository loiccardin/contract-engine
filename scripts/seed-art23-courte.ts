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
 * Stratégie : on copie le contentStandard et on insère le bloc spécifique
 * "courte durée" (rectangle /pl1/ + ligne /jr1/) au bon endroit, sans toucher
 * au reste de l'article.
 */

const COURTE_BLOCK = `- Louer le LOGEMENT, durant l'année, pendant les périodes suivantes :

/pl1/

Soit /jr1/ jours

Ci-après désignée la « Période de location du LOGEMENT »`;

async function main() {
  const art = await prisma.article.findUnique({ where: { code: "art_2_3" } });
  if (!art) throw new Error("art_2_3 non trouvé");
  if (art.scope !== "duree") throw new Error(`art_2_3 scope='${art.scope}', attendu 'duree' (Phase 1 non appliquée ?)`);
  if (!art.contentStandard) throw new Error("art_2_3.contentStandard est NULL");

  // Si déjà rempli, on n'écrase pas
  if (art.contentCourte && art.contentCourte.includes("/pl1/")) {
    console.log("art_2_3.contentCourte déjà rempli (contient /pl1/) — skip");
    return;
  }

  // Texte temporaire : on prend tel quel le standard et on ajoute le bloc
  // courte durée à la suite du préambule de l'article.
  // L'objectif est uniquement de tester visuellement le rendu DOCX/DocuSign.
  const tempContent = `${art.contentStandard.trim()}

${COURTE_BLOCK}`;

  await prisma.article.update({
    where: { code: "art_2_3" },
    data: { contentCourte: tempContent },
  });

  console.log("art_2_3.contentCourte rempli (contenu temporaire avec /pl1/ et /jr1/)");
  console.log(`   Longueur: ${tempContent.length} chars`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
