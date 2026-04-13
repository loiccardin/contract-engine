import { config } from "dotenv";
config({ path: ".env.local" });

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const courteContracts = [
  { code: "P7.P.CJ", commissionType: "studio", statutType: "particulier", menageType: "zones_cj",    dureeType: "courte" },
  { code: "P7.P.R",  commissionType: "studio", statutType: "particulier", menageType: "zones_r",     dureeType: "courte" },
  { code: "P7.S.CJ", commissionType: "studio", statutType: "societe",     menageType: "zones_cj",    dureeType: "courte" },
  { code: "P7.S.R",  commissionType: "studio", statutType: "societe",     menageType: "zones_r",     dureeType: "courte" },
  { code: "P8.P",    commissionType: "studio", statutType: "particulier", menageType: "sans_menage", dureeType: "courte" },
  { code: "P8.S",    commissionType: "studio", statutType: "societe",     menageType: "sans_menage", dureeType: "courte" },
];

async function main() {
  // 1. Forcer duree_type = 'standard' sur les contrats existants (no-op si déjà fait par DEFAULT)
  const updated = await prisma.contract.updateMany({
    where: { dureeType: { not: "courte" } },
    data: { dureeType: "standard" },
  });
  console.log(`Updated ${updated.count} existing contracts to duree_type='standard'`);

  // 2. Insérer les 6 nouveaux contrats courte durée
  for (const contract of courteContracts) {
    await prisma.contract.upsert({
      where: { code: contract.code },
      update: {
        commissionType: contract.commissionType,
        statutType: contract.statutType,
        menageType: contract.menageType,
        dureeType: contract.dureeType,
      },
      create: contract,
    });
  }
  console.log(`Seeded ${courteContracts.length} courte-duree contracts`);

  // 3. Migrer art_2_3 : scope 'common' -> 'duree', copier content_common -> content_standard
  const art23 = await prisma.article.findUnique({ where: { code: "art_2_3" } });
  if (!art23) {
    console.warn("art_2_3 not found — skipping scope migration");
  } else if (art23.scope === "duree") {
    console.log("art_2_3 already in scope 'duree' — skipping");
  } else {
    await prisma.article.update({
      where: { code: "art_2_3" },
      data: {
        scope: "duree",
        contentStandard: art23.contentCommon,
        contentCourte: null,
        contentCommon: null,
      },
    });
    console.log("art_2_3 migrated: scope='duree', content_common -> content_standard");
  }

  // 4. Vérification
  const total = await prisma.contract.count();
  const standard = await prisma.contract.count({ where: { dureeType: "standard" } });
  const courte = await prisma.contract.count({ where: { dureeType: "courte" } });
  console.log(`Total contracts: ${total} (standard: ${standard}, courte: ${courte})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
