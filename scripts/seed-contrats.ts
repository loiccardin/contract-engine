import { config } from "dotenv";
config({ path: ".env.local" });

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

/**
 * Seed des 24 contrats définitifs (C1-C8) + mise à jour des 24 promesses
 * (P1-P8) en document_type='promesse'.
 *
 * Chaque C* hérite de la même grille axes (commission/statut/menage/duree)
 * que sa promesse P* correspondante — seule la lettre change.
 */

const CONTRAT_VARIANTS = [
  // Classique (C1 = avec ménage, C2 = sans)
  { code: "C1.P.CJ", commissionType: "classique", statutType: "particulier", menageType: "zones_cj",    dureeType: "standard" },
  { code: "C1.P.R",  commissionType: "classique", statutType: "particulier", menageType: "zones_r",     dureeType: "standard" },
  { code: "C1.S.CJ", commissionType: "classique", statutType: "societe",     menageType: "zones_cj",    dureeType: "standard" },
  { code: "C1.S.R",  commissionType: "classique", statutType: "societe",     menageType: "zones_r",     dureeType: "standard" },
  { code: "C2.P",    commissionType: "classique", statutType: "particulier", menageType: "sans_menage", dureeType: "standard" },
  { code: "C2.S",    commissionType: "classique", statutType: "societe",     menageType: "sans_menage", dureeType: "standard" },

  // Studio (C3 = avec ménage, C4 = sans)
  { code: "C3.P.CJ", commissionType: "studio", statutType: "particulier", menageType: "zones_cj",    dureeType: "standard" },
  { code: "C3.P.R",  commissionType: "studio", statutType: "particulier", menageType: "zones_r",     dureeType: "standard" },
  { code: "C3.S.CJ", commissionType: "studio", statutType: "societe",     menageType: "zones_cj",    dureeType: "standard" },
  { code: "C3.S.R",  commissionType: "studio", statutType: "societe",     menageType: "zones_r",     dureeType: "standard" },
  { code: "C4.P",    commissionType: "studio", statutType: "particulier", menageType: "sans_menage", dureeType: "standard" },
  { code: "C4.S",    commissionType: "studio", statutType: "societe",     menageType: "sans_menage", dureeType: "standard" },

  // 20% (C5 = avec ménage, C6 = sans)
  { code: "C5.P.CJ", commissionType: "20pct", statutType: "particulier", menageType: "zones_cj",    dureeType: "standard" },
  { code: "C5.P.R",  commissionType: "20pct", statutType: "particulier", menageType: "zones_r",     dureeType: "standard" },
  { code: "C5.S.CJ", commissionType: "20pct", statutType: "societe",     menageType: "zones_cj",    dureeType: "standard" },
  { code: "C5.S.R",  commissionType: "20pct", statutType: "societe",     menageType: "zones_r",     dureeType: "standard" },
  { code: "C6.P",    commissionType: "20pct", statutType: "particulier", menageType: "sans_menage", dureeType: "standard" },
  { code: "C6.S",    commissionType: "20pct", statutType: "societe",     menageType: "sans_menage", dureeType: "standard" },

  // Courte durée (C7 = avec ménage, C8 = sans)
  { code: "C7.P.CJ", commissionType: "studio", statutType: "particulier", menageType: "zones_cj",    dureeType: "courte" },
  { code: "C7.P.R",  commissionType: "studio", statutType: "particulier", menageType: "zones_r",     dureeType: "courte" },
  { code: "C7.S.CJ", commissionType: "studio", statutType: "societe",     menageType: "zones_cj",    dureeType: "courte" },
  { code: "C7.S.R",  commissionType: "studio", statutType: "societe",     menageType: "zones_r",     dureeType: "courte" },
  { code: "C8.P",    commissionType: "studio", statutType: "particulier", menageType: "sans_menage", dureeType: "courte" },
  { code: "C8.S",    commissionType: "studio", statutType: "societe",     menageType: "sans_menage", dureeType: "courte" },
];

async function main() {
  // 1. Forcer document_type='promesse' sur toutes les P*
  const updP = await prisma.contract.updateMany({
    where: { code: { startsWith: "P" } },
    data: { documentType: "promesse" },
  });
  console.log(`✓ ${updP.count} promesses → document_type='promesse'`);

  // 2. Insérer les 24 contrats (upsert pour idempotence)
  for (const c of CONTRAT_VARIANTS) {
    await prisma.contract.upsert({
      where: { code: c.code },
      update: {
        commissionType: c.commissionType,
        statutType: c.statutType,
        menageType: c.menageType,
        dureeType: c.dureeType,
        documentType: "contrat",
      },
      create: { ...c, documentType: "contrat" },
    });
  }
  console.log(`✓ ${CONTRAT_VARIANTS.length} contrats C* upsertés`);

  // 3. Vérifs
  const counts = await prisma.contract.groupBy({
    by: ["documentType"],
    _count: true,
  });
  console.log("\nRépartition document_type:");
  for (const c of counts.sort((a, b) => a.documentType.localeCompare(b.documentType))) {
    console.log(`  ${c.documentType.padEnd(10)} ${c._count}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
