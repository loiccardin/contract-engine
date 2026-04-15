import { Article, Contract, AssembledArticle } from "@/types";
import {
  CONTRAT_TITLE_REMAPPING,
  CONTRAT_SUBTITLE_REMAPPING,
} from "@/config/contrat-remapping";

export type DocumentType = "promesse" | "contrat";

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

    case "duree":
      switch (contract.dureeType) {
        case "standard": return article.contentStandard;
        case "courte":   return article.contentCourte;
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
  // Exclure art_2_2_intro (titre parent "2.2. Services assurés", pas une sous-section)
  let counter22 = 1;
  for (const a of filteredArticles) {
    if (!a.code.startsWith("art_2_2_")) continue;
    if (a.code === "art_2_2_intro") continue;
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
 * Filtre les articles selon le type de document à générer.
 *  - "promesse" → articles `all` + `promesse_only`
 *  - "contrat"  → articles `all` + `contrat_only`
 */
function filterArticlesForDocument(
  articles: Article[],
  documentType: DocumentType
): Article[] {
  return articles.filter((a) => {
    if (a.documentType === "all") return true;
    return documentType === "promesse"
      ? a.documentType === "promesse_only"
      : a.documentType === "contrat_only";
  });
}

/**
 * Applique le remapping de titre pour les contrats.
 * Si le code est dans CONTRAT_TITLE_REMAPPING → titre tout-en-MAJUSCULES
 * (header de section). Sinon → applique CONTRAT_SUBTITLE_REMAPPING (renumérotation
 * de sous-titres dans le titre, ex "2.2.5" → "2.5").
 *
 * Les articles `contrat_only` ne sont jamais remappés ici — leur titre est
 * déjà écrit dans la version finale en DB.
 */
function remapTitleForContrat(article: Article): string {
  if (article.documentType !== "all") return article.title;

  const major = CONTRAT_TITLE_REMAPPING[article.code];
  if (major) return major;

  let title = article.title;
  for (const [from, to] of CONTRAT_SUBTITLE_REMAPPING) {
    title = title.split(from).join(to);
  }
  return title;
}

/**
 * Assemble un contrat : sélectionne les bons contenus, exclut les articles NULL,
 * et calcule la numérotation dynamique des sections 2.2.x et 2.4.x.
 *
 * Le paramètre `documentType` (default "promesse") filtre les articles selon
 * le type de document cible. Pour "contrat", les titres sont remappés
 * (TITLE_REMAPPING + SUBTITLE_REMAPPING). Le remapping du contenu est délégué
 * au docx-generator pour qu'il s'applique APRÈS la numérotation dynamique.
 */
export function assembleContract(
  articles: Article[],
  contract: Contract,
  documentType: DocumentType = "promesse"
): AssembledArticle[] {
  // 0. Filtrer selon le type de document
  const eligible = filterArticlesForDocument(articles, documentType);

  // 1. Sélectionner le contenu et filtrer les articles NULL
  const filtered: { article: Article; content: string }[] = [];

  for (const article of eligible) {
    const content = selectContent(article, contract);
    if (content === null || content === undefined) continue;
    filtered.push({ article, content });
  }

  // 2. Calculer la numérotation dynamique
  const sectionNumbers = computeSectionNumbers(
    filtered.map((f) => ({ code: f.article.code, content: f.content }))
  );

  // 3. Construire le résultat (avec remapping de titre si contrat)
  return filtered.map(({ article, content }) => ({
    code: article.code,
    title: documentType === "contrat" ? remapTitleForContrat(article) : article.title,
    content,
    orderIndex: article.orderIndex,
    isPageBreakBefore: article.isPageBreakBefore,
    keepTogether: article.keepTogether,
    sectionNumber: sectionNumbers.get(article.code) ?? null,
    articleDocumentType: article.documentType,
  }));
}
