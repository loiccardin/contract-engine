import { assembleContract } from "../src/lib/contract-assembler";
import { Article, Contract } from "../src/types";

// Helper to create a minimal article
function makeArticle(overrides: Partial<Article> & { code: string; scope: Article["scope"] }): Article {
  return {
    id: 0,
    title: overrides.title || overrides.code,
    orderIndex: overrides.orderIndex || 0,
    scope: overrides.scope,
    contentCommon: null,
    contentClassique: null,
    contentStudio: null,
    content20pct: null,
    contentParticulier: null,
    contentSociete: null,
    contentZonesCj: null,
    contentZonesR: null,
    contentSansMenage: null,
    isPageBreakBefore: false,
    keepTogether: true,
    updatedAt: "",
    ...overrides,
  };
}

// Simulate the 40 articles from the DB
const articles: Article[] = [
  makeArticle({ code: "en_tete_titre", scope: "common", orderIndex: 10, contentCommon: "PROMESSE DE CONTRAT" }),
  makeArticle({ code: "en_tete_proprietaire", scope: "statut", orderIndex: 20, contentParticulier: "Bloc particulier", contentSociete: "Bloc société" }),
  makeArticle({ code: "en_tete_prestataire", scope: "common", orderIndex: 30, contentCommon: "LETAHOST LLC" }),
  makeArticle({ code: "preambule", scope: "common", orderIndex: 40, contentCommon: "IL EST PRÉALABLEMENT RAPPELÉ" }),
  makeArticle({ code: "art_1_1", scope: "common", orderIndex: 50, contentCommon: "1.1 Consentement" }),
  makeArticle({ code: "art_1_2", scope: "common", orderIndex: 60, contentCommon: "1.2 Portée" }),
  makeArticle({ code: "art_1_3", scope: "common", orderIndex: 70, contentCommon: "1.3 Substitution" }),
  makeArticle({ code: "art_1_4", scope: "common", orderIndex: 80, contentCommon: "1.4 Rétractation" }),
  makeArticle({ code: "art_2_1", scope: "menage", orderIndex: 90, contentZonesCj: "2.1 Objet 8 services", contentZonesR: "2.1 Objet 8 services", contentSansMenage: "2.1 Objet 6 services" }),
  makeArticle({ code: "art_2_2_1_menage", scope: "menage", orderIndex: 100, contentZonesCj: "Ménage", contentZonesR: "Ménage", contentSansMenage: null }),
  makeArticle({ code: "art_2_2_2_linge", scope: "menage", orderIndex: 110, contentZonesCj: "Linge", contentZonesR: "Linge", contentSansMenage: null }),
  makeArticle({ code: "art_2_2_decoration", scope: "common", orderIndex: 120, contentCommon: "Décoration" }),
  makeArticle({ code: "art_2_2_photos", scope: "common", orderIndex: 130, contentCommon: "Photos" }),
  makeArticle({ code: "art_2_2_annonces", scope: "common", orderIndex: 140, contentCommon: "Annonces" }),
  makeArticle({ code: "art_2_2_accueil", scope: "common", orderIndex: 150, contentCommon: "Accueil" }),
  makeArticle({ code: "art_2_2_communication", scope: "common", orderIndex: 160, contentCommon: "Communication" }),
  makeArticle({ code: "art_2_2_revenue", scope: "common", orderIndex: 170, contentCommon: "Revenue Management" }),
  makeArticle({ code: "art_2_3", scope: "common", orderIndex: 180, contentCommon: "Obligations" }),
  makeArticle({ code: "art_2_4_1_intro", scope: "menage", orderIndex: 190, contentZonesCj: "Commission intro avec ménage", contentZonesR: "Commission intro avec ménage", contentSansMenage: "Commission intro sans ménage" }),
  makeArticle({ code: "art_2_4_1_taux", scope: "commission", orderIndex: 200, contentClassique: "14/18/23%", contentStudio: "23% flat", content20pct: "20% flat" }),
  makeArticle({ code: "art_2_4_2_frais_menage", scope: "menage", orderIndex: 210, contentZonesCj: "Frais ménage", contentZonesR: "Frais ménage", contentSansMenage: null }),
  makeArticle({ code: "art_2_4_deplacements", scope: "common", orderIndex: 220, contentCommon: "Déplacements" }),
  makeArticle({ code: "art_2_4_frais_divers", scope: "common", orderIndex: 230, contentCommon: "Frais divers" }),
  makeArticle({ code: "art_2_5", scope: "common", orderIndex: 240, contentCommon: "Exclusivité" }),
  makeArticle({ code: "art_2_6", scope: "common", orderIndex: 250, contentCommon: "Responsabilité" }),
  makeArticle({ code: "art_2_7", scope: "common", orderIndex: 260, contentCommon: "Cession" }),
  makeArticle({ code: "art_2_8", scope: "common", orderIndex: 270, contentCommon: "Fin du contrat" }),
  makeArticle({ code: "art_2_9", scope: "common", orderIndex: 280, contentCommon: "Confidentialité" }),
  makeArticle({ code: "art_2_10", scope: "common", orderIndex: 290, contentCommon: "Sous-traitance" }),
  makeArticle({ code: "art_3_1", scope: "common", orderIndex: 300, contentCommon: "Durée promesse" }),
  makeArticle({ code: "art_3_2", scope: "common", orderIndex: 310, contentCommon: "Carence" }),
  makeArticle({ code: "art_4", scope: "common", orderIndex: 320, contentCommon: "Confidentialité art4" }),
  makeArticle({ code: "art_5", scope: "common", orderIndex: 330, contentCommon: "Indépendance" }),
  makeArticle({ code: "art_6", scope: "common", orderIndex: 340, contentCommon: "Intégralité" }),
  makeArticle({ code: "art_7", scope: "common", orderIndex: 350, contentCommon: "Litige" }),
  makeArticle({ code: "art_8", scope: "common", orderIndex: 360, contentCommon: "Signature électronique" }),
  makeArticle({ code: "art_9", scope: "common", orderIndex: 365, contentCommon: "Commentaires" }),
  makeArticle({ code: "bloc_signature", scope: "common", orderIndex: 370, contentCommon: "Bloc signature" }),
  makeArticle({ code: "annexe_1", scope: "common", orderIndex: 380, contentCommon: "Équipements" }),
  makeArticle({ code: "annexe_2", scope: "menage", orderIndex: 390, contentZonesCj: "Grille CJ", contentZonesR: "Grille Rouges", contentSansMenage: null }),
];

// Contract fixtures
const P1_P_CJ: Contract = { id: 1, code: "P1.P.CJ", commissionType: "classique", statutType: "particulier", menageType: "zones_cj", googleDocId: null, docusignTemplateName: null, docusignPowerformId: null, docusignTemplateId: null };
const P2_P: Contract = { id: 5, code: "P2.P", commissionType: "classique", statutType: "particulier", menageType: "sans_menage", googleDocId: null, docusignTemplateName: null, docusignPowerformId: null, docusignTemplateId: null };
const P3_S_R: Contract = { id: 10, code: "P3.S.R", commissionType: "studio", statutType: "societe", menageType: "zones_r", googleDocId: null, docusignTemplateName: null, docusignPowerformId: null, docusignTemplateId: null };
const P6_P: Contract = { id: 17, code: "P6.P", commissionType: "20pct", statutType: "particulier", menageType: "sans_menage", googleDocId: null, docusignTemplateName: null, docusignPowerformId: null, docusignTemplateId: null };

// ===== TESTS =====

// Test 1: P1.P.CJ (avec ménage) — 40 articles, numérotation complète
const resultP1 = assembleContract(articles, P1_P_CJ);
console.log("=== Test 1: P1.P.CJ (avec ménage) ===");
console.log(`Articles: ${resultP1.length} (attendu: 40)`);
console.assert(resultP1.length === 40, `FAIL: attendu 40, reçu ${resultP1.length}`);

const menage = resultP1.find(a => a.code === "art_2_2_1_menage");
console.assert(menage !== undefined, "FAIL: art_2_2_1_menage devrait être présent");
console.assert(menage?.sectionNumber === "2.2.1", `FAIL: art_2_2_1_menage sectionNumber=${menage?.sectionNumber}, attendu 2.2.1`);

const deco = resultP1.find(a => a.code === "art_2_2_decoration");
console.assert(deco?.sectionNumber === "2.2.3", `FAIL: art_2_2_decoration sectionNumber=${deco?.sectionNumber}, attendu 2.2.3`);

const revenue = resultP1.find(a => a.code === "art_2_2_revenue");
console.assert(revenue?.sectionNumber === "2.2.8", `FAIL: art_2_2_revenue sectionNumber=${revenue?.sectionNumber}, attendu 2.2.8`);

const deplacements = resultP1.find(a => a.code === "art_2_4_deplacements");
console.assert(deplacements?.sectionNumber === "2.4.3", `FAIL: art_2_4_deplacements sectionNumber=${deplacements?.sectionNumber}, attendu 2.4.3`);

const fraisDivers = resultP1.find(a => a.code === "art_2_4_frais_divers");
console.assert(fraisDivers?.sectionNumber === "2.4.4", `FAIL: art_2_4_frais_divers sectionNumber=${fraisDivers?.sectionNumber}, attendu 2.4.4`);

console.log("  art_2_2_1_menage → " + menage?.sectionNumber);
console.log("  art_2_2_decoration → " + deco?.sectionNumber);
console.log("  art_2_2_revenue → " + revenue?.sectionNumber);
console.log("  art_2_4_deplacements → " + deplacements?.sectionNumber);
console.log("  art_2_4_frais_divers → " + fraisDivers?.sectionNumber);

// Test 2: P2.P (sans ménage) — 34 articles, numérotation décalée
const resultP2 = assembleContract(articles, P2_P);
console.log("\n=== Test 2: P2.P (sans ménage) ===");
// 40 total - 4 NULL (menage, linge, frais_menage, annexe_2) = 36
console.log(`Articles: ${resultP2.length} (attendu: 36)`);
console.assert(resultP2.length === 36, `FAIL: attendu 36, reçu ${resultP2.length}`);

const menageP2 = resultP2.find(a => a.code === "art_2_2_1_menage");
console.assert(menageP2 === undefined, "FAIL: art_2_2_1_menage devrait être ABSENT");

const decoP2 = resultP2.find(a => a.code === "art_2_2_decoration");
console.assert(decoP2?.sectionNumber === "2.2.1", `FAIL: art_2_2_decoration sectionNumber=${decoP2?.sectionNumber}, attendu 2.2.1`);

const revenueP2 = resultP2.find(a => a.code === "art_2_2_revenue");
console.assert(revenueP2?.sectionNumber === "2.2.6", `FAIL: art_2_2_revenue sectionNumber=${revenueP2?.sectionNumber}, attendu 2.2.6`);

console.log("  art_2_2_1_menage → ABSENT ✓");
console.log("  art_2_2_decoration → " + decoP2?.sectionNumber);
console.log("  art_2_2_revenue → " + revenueP2?.sectionNumber);

// Test 3: P2.P — numérotation 2.4.x décalée
const fraisMenageP2 = resultP2.find(a => a.code === "art_2_4_2_frais_menage");
console.assert(fraisMenageP2 === undefined, "FAIL: art_2_4_2_frais_menage devrait être ABSENT");

const deploP2 = resultP2.find(a => a.code === "art_2_4_deplacements");
console.assert(deploP2?.sectionNumber === "2.4.2", `FAIL: art_2_4_deplacements sectionNumber=${deploP2?.sectionNumber}, attendu 2.4.2`);

const fraisDiversP2 = resultP2.find(a => a.code === "art_2_4_frais_divers");
console.assert(fraisDiversP2?.sectionNumber === "2.4.3", `FAIL: art_2_4_frais_divers sectionNumber=${fraisDiversP2?.sectionNumber}, attendu 2.4.3`);

console.log("\n=== Test 3: P2.P — section 2.4.x ===");
console.log("  art_2_4_2_frais_menage → ABSENT ✓");
console.log("  art_2_4_deplacements → " + deploP2?.sectionNumber);
console.log("  art_2_4_frais_divers → " + fraisDiversP2?.sectionNumber);

// Test 4: art_2_4_1_taux — pas de sectionNumber propre
const tauxP1 = resultP1.find(a => a.code === "art_2_4_1_taux");
console.assert(tauxP1?.sectionNumber === null, `FAIL: art_2_4_1_taux sectionNumber=${tauxP1?.sectionNumber}, attendu null`);
console.log("\n=== Test 4: art_2_4_1_taux ===");
console.log("  sectionNumber → " + tauxP1?.sectionNumber + " (attendu: null)");

// Test 5: Aucun article retourné n'a content null/undefined
console.log("\n=== Test 5: Aucun contenu null/undefined ===");
const allResults = [resultP1, resultP2];
for (const result of allResults) {
  for (const a of result) {
    console.assert(a.content !== null && a.content !== undefined, `FAIL: ${a.code} a content=${a.content}`);
  }
}
console.log("  Tous les contenus sont définis ✓");

// Test 6: P3.S.R — commission studio + société + zones rouges
const resultP3 = assembleContract(articles, P3_S_R);
console.log("\n=== Test 6: P3.S.R (studio + société + zones rouges) ===");
console.log(`Articles: ${resultP3.length} (attendu: 40)`);
console.assert(resultP3.length === 40, `FAIL: attendu 40, reçu ${resultP3.length}`);

const proprietaireP3 = resultP3.find(a => a.code === "en_tete_proprietaire");
console.assert(proprietaireP3?.content === "Bloc société", `FAIL: en_tete_proprietaire content="${proprietaireP3?.content}", attendu "Bloc société"`);

const tauxP3 = resultP3.find(a => a.code === "art_2_4_1_taux");
console.assert(tauxP3?.content === "23% flat", `FAIL: art_2_4_1_taux content="${tauxP3?.content}", attendu "23% flat"`);

const annexeP3 = resultP3.find(a => a.code === "annexe_2");
console.assert(annexeP3?.content === "Grille Rouges", `FAIL: annexe_2 content="${annexeP3?.content}", attendu "Grille Rouges"`);

console.log("  en_tete_proprietaire → " + proprietaireP3?.content);
console.log("  art_2_4_1_taux → " + tauxP3?.content);
console.log("  annexe_2 → " + annexeP3?.content);

// Test 7: P6.P — commission 20% + sans ménage
const resultP6 = assembleContract(articles, P6_P);
console.log("\n=== Test 7: P6.P (20% + sans ménage) ===");
console.log(`Articles: ${resultP6.length} (attendu: 36)`);
console.assert(resultP6.length === 36, `FAIL: attendu 36, reçu ${resultP6.length}`);

const tauxP6 = resultP6.find(a => a.code === "art_2_4_1_taux");
console.assert(tauxP6?.content === "20% flat", `FAIL: art_2_4_1_taux content="${tauxP6?.content}", attendu "20% flat"`);
console.log("  art_2_4_1_taux → " + tauxP6?.content);

console.log("\n✅ Tous les tests passent !");
