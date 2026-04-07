import { config } from "dotenv";
config({ path: ".env.local" });

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const contracts = [
  { code: "P1.P.CJ", commissionType: "classique", statutType: "particulier", menageType: "zones_cj" },
  { code: "P1.P.R",  commissionType: "classique", statutType: "particulier", menageType: "zones_r" },
  { code: "P1.S.CJ", commissionType: "classique", statutType: "societe",     menageType: "zones_cj" },
  { code: "P1.S.R",  commissionType: "classique", statutType: "societe",     menageType: "zones_r" },
  { code: "P2.P",    commissionType: "classique", statutType: "particulier", menageType: "sans_menage" },
  { code: "P2.S",    commissionType: "classique", statutType: "societe",     menageType: "sans_menage" },
  { code: "P3.P.CJ", commissionType: "studio",    statutType: "particulier", menageType: "zones_cj" },
  { code: "P3.P.R",  commissionType: "studio",    statutType: "particulier", menageType: "zones_r" },
  { code: "P3.S.CJ", commissionType: "studio",    statutType: "societe",     menageType: "zones_cj" },
  { code: "P3.S.R",  commissionType: "studio",    statutType: "societe",     menageType: "zones_r" },
  { code: "P4.P",    commissionType: "studio",    statutType: "particulier", menageType: "sans_menage" },
  { code: "P4.S",    commissionType: "studio",    statutType: "societe",     menageType: "sans_menage" },
  { code: "P5.P.CJ", commissionType: "20pct",     statutType: "particulier", menageType: "zones_cj" },
  { code: "P5.P.R",  commissionType: "20pct",     statutType: "particulier", menageType: "zones_r" },
  { code: "P5.S.CJ", commissionType: "20pct",     statutType: "societe",     menageType: "zones_cj" },
  { code: "P5.S.R",  commissionType: "20pct",     statutType: "societe",     menageType: "zones_r" },
  { code: "P6.P",    commissionType: "20pct",     statutType: "particulier", menageType: "sans_menage" },
  { code: "P6.S",    commissionType: "20pct",     statutType: "societe",     menageType: "sans_menage" },
];

async function main() {
  for (const contract of contracts) {
    await prisma.contract.upsert({
      where: { code: contract.code },
      update: {},
      create: contract,
    });
  }
  console.log(`Seeded ${contracts.length} contracts`);
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
