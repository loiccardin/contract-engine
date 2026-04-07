import { Article, Contract, AssembledArticle } from "@/types";

/**
 * Sélectionne le bon contenu d'un article selon le scope et le contrat cible.
 * Retourne null si l'article est absent de cette variante.
 */
function selectContent(article: Article, contract: Contract): string | null {
  switch (article.scope) {
    case "common":
      return article.contentCommon;

    case "commission":
      switch (contract.commissionType) {
        case "classique": return article.contentClassique;
        case "studio":    return article.contentStudio;
        case "20pct":     return article.content20pct;
      }
      break;

    case "statut":
      switch (contract.statutType) {
        case "particulier": return article.contentParticulier;
        case "societe":     return article.contentSociete;
      }
      break;

    case "menage":
      switch (contract.menageType) {
        case "zones_cj":    return article.contentZonesCj;
        case "zones_r":     return article.contentZonesR;
        case "sans_menage": return article.contentSansMenage;
      }
      break;
  }

  return null;
}

/**
 * Calcule la numérotation dynamique pour les groupes 2.2.x et 2.4.x.
 * Les articles ménage absents (NULL) décalent la numérotation.
 */
function computeSectionNumbers(
  filteredArticles: { code: string; content: string }[]
): Map<string, string> {
  const numbers = new Map<string, string>();

  // Groupe 2.2 : articles dont le code commence par "art_2_2_"
  let counter22 = 1;
  for (const a of filteredArticles) {
    if (!a.code.startsWith("art_2_2_")) continue;
    numbers.set(a.code, `2.2.${counter22}`);
    counter22++;
  }

  // Groupe 2.4 : articles dont le code commence par "art_2_4_"
  // art_2_4_1_taux fait partie de 2.4.1, pas de numéro propre
  let counter24 = 1;
  for (const a of filteredArticles) {
    if (!a.code.startsWith("art_2_4_")) continue;
    if (a.code === "art_2_4_1_taux") {
      // Pas de numéro propre — continuation de 2.4.1
      continue;
    }
    numbers.set(a.code, `2.4.${counter24}`);
    counter24++;
  }

  return numbers;
}

/**
 * Assemble un contrat : sélectionne les bons contenus, exclut les articles NULL,
 * et calcule la numérotation dynamique des sections 2.2.x et 2.4.x.
 */
export function assembleContract(
  articles: Article[],
  contract: Contract
): AssembledArticle[] {
  // 1. Sélectionner le contenu et filtrer les articles NULL
  const filtered: { article: Article; content: string }[] = [];

  for (const article of articles) {
    const content = selectContent(article, contract);
    if (content === null || content === undefined) continue;
    filtered.push({ article, content });
  }

  // 2. Calculer la numérotation dynamique
  const sectionNumbers = computeSectionNumbers(
    filtered.map((f) => ({ code: f.article.code, content: f.content }))
  );

  // 3. Construire le résultat
  return filtered.map(({ article, content }) => ({
    code: article.code,
    title: article.title,
    content,
    orderIndex: article.orderIndex,
    isPageBreakBefore: article.isPageBreakBefore,
    keepTogether: article.keepTogether,
    sectionNumber: sectionNumbers.get(article.code) ?? null,
  }));
}
