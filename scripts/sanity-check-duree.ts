import { config } from "dotenv";
config({ path: ".env.local" });

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { assembleContract } from "../src/lib/contract-assembler";
import type { Article, Contract } from "../src/types";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const articles = (await prisma.article.findMany({ orderBy: { orderIndex: "asc" } })) as unknown as Article[];
  const contracts = (await prisma.contract.findMany()) as unknown as Contract[];

  const codes = ["P1.P.CJ", "P3.S.R", "P6.P", "P7.P.CJ"];
  for (const code of codes) {
    const c = contracts.find((x) => x.code === code);
    if (!c) { console.log(`[${code}] MISSING`); continue; }
    const out = assembleContract(articles, c);
    console.log(`\n=== ${code} (duree=${c.dureeType}) — ${out.length} articles assemblés ===`);
    const art23 = out.find((a) => a.code === "art_2_3");
    console.log(`  art_2_3 present: ${!!art23}, content starts: ${art23?.content?.slice(0, 60) ?? "NULL"}`);
    const art1 = out.find((a) => a.code === "art_1");
    console.log(`  art_1   present: ${!!art1}, content starts: ${art1?.content?.slice(0, 60) ?? "NULL"}`);
  }

  // Regression check: P1.P.CJ vs P7.P.CJ — tous articles sauf art_2_3 doivent être identiques
  const p1 = contracts.find((x) => x.code === "P1.P.CJ")!;
  const p7 = contracts.find((x) => x.code === "P7.P.CJ")!;
  const out1 = assembleContract(articles, p1);
  const out7 = assembleContract(articles, p7);
  const diffs: string[] = [];
  const allCodes = new Set([...out1.map(a => a.code), ...out7.map(a => a.code)]);
  for (const code of allCodes) {
    const a = out1.find(x => x.code === code);
    const b = out7.find(x => x.code === code);
    if ((a?.content ?? null) !== (b?.content ?? null)) diffs.push(code);
  }
  console.log(`\n=== P1.P.CJ vs P7.P.CJ (commission=studio différente → art commission attendus) ===`);
  console.log(`  Differing article codes: ${diffs.join(", ") || "(none)"}`);

  // P3.P.CJ vs P7.P.CJ : même commission studio, même statut/menage → seul art_2_3 doit différer
  const p3 = contracts.find((x) => x.code === "P3.P.CJ")!;
  const out3 = assembleContract(articles, p3);
  const diffs37: string[] = [];
  const allCodes2 = new Set([...out3.map(a => a.code), ...out7.map(a => a.code)]);
  for (const code of allCodes2) {
    const a = out3.find(x => x.code === code);
    const b = out7.find(x => x.code === code);
    if ((a?.content ?? null) !== (b?.content ?? null)) diffs37.push(code);
  }
  console.log(`\n=== P3.P.CJ vs P7.P.CJ (seule différence = dureeType) ===`);
  console.log(`  Differing article codes: ${diffs37.join(", ") || "(none)"} (attendu: art_2_3 uniquement)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
