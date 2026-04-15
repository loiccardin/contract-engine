import { config } from "dotenv";
config({ path: ".env.local" });
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

/**
 * Corrections DB pour le rendu des contrats définitifs :
 *  - BUG 1 : art_2_1 devient promesse_only (doublon avec art_objet_contrat)
 *  - BUG 2 : préfixer les contenus des contrat_only avec leur numéro de section
 *           quand c'est manquant (art_objet_contrat → "1. OBJET DU CONTRAT")
 *  - BUG 8 : créer art_divers (chapeau "12. DIVERS") et décaler
 *           art_imprevision/non_renonciation pour que l'ordre de rendu soit
 *           295 legislation_sociale → 296 divers → 297 imprévision →
 *           298 non-renonciation → 330 nullité
 */

async function main() {
  // ---------- BUG 1 ----------
  const art21 = await prisma.article.findUnique({ where: { code: "art_2_1" } });
  if (art21 && art21.documentType !== "promesse_only") {
    await prisma.article.update({
      where: { code: "art_2_1" },
      data: { documentType: "promesse_only" },
    });
    console.log(`✓ art_2_1 → promesse_only`);
  } else {
    console.log(`  art_2_1 déjà promesse_only`);
  }

  // ---------- BUG 2 : art_objet_contrat commence par "OBJET DU CONTRAT", on préfixe "1. " ----------
  const objet = await prisma.article.findUnique({ where: { code: "art_objet_contrat" } });
  if (objet?.contentCommon) {
    const lines = objet.contentCommon.split("\n");
    if (lines[0].trim() === "OBJET DU CONTRAT") {
      lines[0] = "1. OBJET DU CONTRAT";
      await prisma.article.update({
        where: { code: "art_objet_contrat" },
        data: { contentCommon: lines.join("\n") },
      });
      console.log(`✓ art_objet_contrat content → "1. OBJET DU CONTRAT"`);
    } else {
      console.log(`  art_objet_contrat ligne 1 = "${lines[0]}" — skip`);
    }
  }

  // ---------- BUG 8 : décaler art_imprevision / art_non_renonciation + créer art_divers ----------
  const impr = await prisma.article.findUnique({ where: { code: "art_imprevision" } });
  const nonR = await prisma.article.findUnique({ where: { code: "art_non_renonciation" } });

  if (impr && impr.orderIndex !== 297) {
    await prisma.article.update({ where: { code: "art_imprevision" }, data: { orderIndex: 297 } });
    console.log(`✓ art_imprevision : orderIndex ${impr.orderIndex} → 297`);
  }
  if (nonR && nonR.orderIndex !== 298) {
    await prisma.article.update({ where: { code: "art_non_renonciation" }, data: { orderIndex: 298 } });
    console.log(`✓ art_non_renonciation : orderIndex ${nonR.orderIndex} → 298`);
  }

  await prisma.article.upsert({
    where: { code: "art_divers" },
    update: {
      title: "Divers",
      orderIndex: 296,
      scope: "common",
      contentCommon: "12. DIVERS",
      documentType: "contrat_only",
      isPageBreakBefore: false,
      keepTogether: true,
    },
    create: {
      code: "art_divers",
      title: "Divers",
      orderIndex: 296,
      scope: "common",
      contentCommon: "12. DIVERS",
      documentType: "contrat_only",
      isPageBreakBefore: false,
      keepTogether: true,
    },
  });
  console.log(`✓ art_divers (chapeau "12. DIVERS") upserté à orderIndex 296`);

  // ---------- BUG 8 (suite) : préfixer art_nullite_contrat par "12.3" pour qu'il s'affiche sous DIVERS ----------
  const null12 = await prisma.article.findUnique({ where: { code: "art_nullite_contrat" } });
  if (null12?.contentCommon && !null12.contentCommon.trim().startsWith("12.3")) {
    await prisma.article.update({
      where: { code: "art_nullite_contrat" },
      data: { contentCommon: `12.3 ${null12.contentCommon.trim()}` },
    });
    console.log(`✓ art_nullite_contrat préfixé "12.3"`);
  }

  // ---------- Vérif finale ----------
  const counts = await prisma.article.groupBy({ by: ["documentType"], _count: true });
  console.log("\nRépartition document_type:");
  for (const c of counts.sort((a, b) => a.documentType.localeCompare(b.documentType))) {
    console.log(`  ${c.documentType.padEnd(15)} ${c._count}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
