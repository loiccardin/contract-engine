import { config } from "dotenv";
config({ path: ".env.local" });
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

/**
 * Fix DB v2 — mise en forme contrats :
 *  - CORR 5 : remplace les séquences d'em-dashes "———————" par
 *             "—" + 26 × "-" dans les articles contrat_only.
 *  - CORR 6 : ajoute une ligne bold standalone "Nom société" avant
 *             la ligne "Nom société : …" dans en_tete_prestataire_contrat
 *             et dans le bloc Mandataire d'annexe_mandat_debours.
 */

const PLACEHOLDER = "\u2014" + "-".repeat(26);

function replacePlaceholders(content: string): string {
  // Toute séquence d'em-dashes (U+2014) consécutifs (2+) collapse vers le
  // pattern propre "—--------------------------".
  return content.replace(/\u2014{2,}/g, PLACEHOLDER);
}

function addNomSocieteStandalone(content: string): string {
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (/^Nom société\s*:/i.test(t)) {
      // Vérifie qu'on n'a pas déjà une ligne "Nom société" seul juste avant
      let prev = i - 1;
      while (prev >= 0 && lines[prev].trim() === "") prev--;
      if (prev >= 0 && /^Nom société\s*$/i.test(lines[prev].trim())) return content;
      // Insère "Nom société" bold (marqueur textuel — le generator le rendra bold)
      lines.splice(i, 0, "Nom société");
      return lines.join("\n");
    }
  }
  return content;
}

async function main() {
  const codes = [
    "en_tete_prestataire_contrat",
    "annexe_mandat_debours",
    "art_rgpd",
    "art_objet_contrat",
    "art_nullite_contrat",
  ];

  for (const code of codes) {
    const a = await prisma.article.findUnique({ where: { code } });
    if (!a?.contentCommon) { console.log(`  skip ${code} (pas de content_common)`); continue; }

    let content = replacePlaceholders(a.contentCommon);

    if (code === "en_tete_prestataire_contrat" || code === "annexe_mandat_debours") {
      content = addNomSocieteStandalone(content);
    }

    if (content !== a.contentCommon) {
      await prisma.article.update({ where: { code }, data: { contentCommon: content } });
      console.log(`✓ ${code} mis à jour (placeholders + Nom société bold)`);
    } else {
      console.log(`  ${code} déjà à jour`);
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
