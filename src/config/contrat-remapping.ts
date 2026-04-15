/**
 * Constantes de transformation texte appliquées aux articles "all"
 * (partagés promesse + contrat) lorsqu'on génère un contrat définitif.
 *
 * Ne PAS implémenter l'application ici — Phase 2. Ce fichier ne fait
 * qu'exporter les constantes qui seront consommées par le contract-assembler.
 *
 * Les renvois internes utilisent la numérotation de la promesse (2.2.1, etc.)
 * et doivent être remappés vers la numérotation du contrat (2.1, 2.2, etc.).
 */

/**
 * Pairs ordonnés (regex string, replacement). L'ordre est CRITIQUE : du plus
 * spécifique au plus général pour éviter qu'un remap général ("paragraphe 2.2.1")
 * ne mange un sous-renvoi ("paragraphe 2.2.1.1").
 *
 * Les regex sont insensibles à la casse et matchent la chaîne littérale entière
 * (sauf pour les renvois Code civil / CGI listés dans PROTECTED_REFERENCES qui
 * sont vérifiés en amont par l'assembler).
 */
export const CONTRAT_TEXT_REMAPPING: Array<[string, string]> = [
  // A) Renumérotation des renvois internes — du plus spécifique au plus général.
  ["paragraphe 2.2.1.1", "paragraphe 2.1.1"],
  ["paragraphe 2.2.1.2", "paragraphe 2.1.2"],
  ["paragraphe 2.2.1.3", "paragraphe 2.1.3"],
  ["paragraphe 2.2.1",   "paragraphe 2.1"],
  ["paragraphe 2.2.2",   "paragraphe 2.2"],
  ["paragraphe 2.2.3",   "paragraphe 2.3"],
  ["paragraphe 2.2.4",   "paragraphe 2.4"],
  ["paragraphe 2.2.5",   "paragraphe 2.5"],
  ["paragraphe 2.2.6",   "paragraphe 2.6"],
  ["paragraphe 2.2.7",   "paragraphe 2.7"],
  ["paragraphe 2.2.8",   "paragraphe 2.8"],
  ["article 2.2",        "article 2"],
  ["article 2.3",        "article 3"],
  ["article 2.4.1",      "article 4.1"],
  ["article 2.4.2",      "article 4.2"],
  ["article 2.4",        "article 4"],
  ["paragraphe 2.4.2",   "paragraphe 4.2"],
  ["article 2.5.3",      "article 5.3"],
  ["article 2.5",        "article 5"],
  ["article 2.8",        "article 8"],

  // Renvois aux annexes — sentinelles temporaires pour éviter la double
  // transformation "Annexe 1" → "Annexe 2" puis "Annexe 2" → "Annexe 4".
  // Variante MAJUSCULES gérée séparément pour les titres.
  ["ANNEXE 1",           "\u0001ANX2\u0001"],
  ["ANNEXE 2",           "\u0001ANX4\u0001"],
  ["Annexe 1",           "\u0001anx2\u0001"],
  ["Annexe 2",           "\u0001anx4\u0001"],
  ["\u0001ANX2\u0001",   "ANNEXE 2"],
  ["\u0001ANX4\u0001",   "ANNEXE 4"],
  ["\u0001anx2\u0001",   "Annexe 2"],
  ["\u0001anx4\u0001",   "Annexe 4"],

  // B) Reformulations textuelles
  ["envisage de confier",                "entend confier"],
  ["Contrat de Prestation de Services",  "présent Contrat"],

  // Bloc signature — plus de "cachet LETAHOST" dans les contrats
  ["Bon pour accord et cachet LETAHOST", "Bon pour accord et signature du PRESTATAIRE"],

  // Placeholders à remplir — harmonisation sur 1 em-dash + 26 tirets simples,
  // à la place des anciennes séquences d'em-dashes collés ("———————").
  // Toutes longueurs d'em-dashes (7/6/5/4) collapsent vers le même pattern.
  ["———————", "\u2014" + "-".repeat(26)],

  // C) Titre du document
  ["PROMESSE DE CONTRAT",        "CONTRAT DE PRESTATIONS DE SERVICES"],
  ["DE PRESTATION DE SERVICES",  ""],
  ["CONCIERGERIE",               "CONCIERGERIE - ACTE ITÉRATIF -"],
];

/**
 * Pattern unique du placeholder "à remplir" : un em-dash (U+2014) suivi
 * de 26 tirets simples (U+002D). Repris tel quel par le générateur et
 * le seed DB pour que le rendu reste cohérent entre les deux.
 */
export const CONTRAT_PLACEHOLDER = "\u2014" + "-".repeat(26);

/**
 * Renvois aux articles du Code civil / Code général des impôts.
 * Ces patterns ne doivent JAMAIS être transformés par CONTRAT_TEXT_REMAPPING —
 * l'assembler doit les protéger en amont (par ex. en remplaçant temporairement
 * par un sentinelle puis en restaurant après le remap).
 */
export const PROTECTED_REFERENCES: string[] = [
  "article 1231",
  "article 2003",
  "article 1195",
  "article 1366",
  "article 1367",
  "article 1375",
  "article 267",
];

/**
 * Titres d'articles à transformer pour les contrats.
 * Clé = code de l'article (`all`), valeur = titre en MAJUSCULES sans numéro
 * (le numéro est déjà géré par le rendu).
 *
 * Le `docx-generator` détecte les titres tout-en-MAJUSCULES pour les rendre
 * comme des headers de section (gras + espacement avant plus grand).
 */
export const CONTRAT_TITLE_REMAPPING: Record<string, string> = {
  art_2_2_intro:    "2. SERVICES ASSURÉS PAR LE PRESTATAIRE",
  art_2_3:          "3. OBLIGATIONS DU PROPRIÉTAIRE",
  art_2_4_1_intro:  "4. RÉMUNÉRATION DU PRESTATAIRE",
  art_2_5:          "5. EXCLUSIVITÉ - DURÉE – RÉSILIATION",
  art_2_6:          "6. RESPONSABILITÉ",
  art_2_7:          "7. CESSION DU CONTRAT",
  art_2_8:          "8. FIN DU CONTRAT",
  art_2_9:          "10. CONFIDENTIALITÉ ET NON-DÉNIGREMENT",
};

/**
 * Renumérotation des sous-titres présents EN TÊTE de contenu d'article.
 * Ordre CRITIQUE : du plus spécifique au plus général.
 *
 * Appliqué par l'assembler sur les titres d'articles `all` qui ne sont PAS
 * dans CONTRAT_TITLE_REMAPPING (sous-sections 2.X.Y → X.Y).
 */
export const CONTRAT_SUBTITLE_REMAPPING: Array<[string, string]> = [
  // Sous-sous-sections "2.2.X.Y" — transformées via sentinelles pour ne pas être
  // re-mappées par la règle "2.5.X" → "5.X" qui vise l'article "2.5 EXCLUSIVITÉ".
  // Ex : "2.2.5.1" (annonces plateformes) → "2.5.1" (pas "5.1").
  ["2.2.1.1.", "\u0001SUB211\u0001"],
  ["2.2.1.2.", "\u0001SUB212\u0001"],
  ["2.2.1.3.", "\u0001SUB213\u0001"],
  ["2.2.5.1.", "\u0001SUB251\u0001"],
  ["2.2.5.2.", "\u0001SUB252\u0001"],
  ["2.2.5.3.", "\u0001SUB253\u0001"],
  ["2.2.1.",   "2.1."],
  ["2.2.2.",   "2.2."],
  ["2.2.3.",   "2.3."],
  ["2.2.4.",   "2.4."],
  ["2.2.5.",   "2.5."],
  ["2.2.6.",   "2.6."],
  ["2.2.7.",   "2.7."],
  ["2.2.8.",   "2.8."],
  ["2.2.8 ",   "2.8. "], // CORR 9 : ancienne typo "2.8" sans point → force le point
  ["2.4.1.",   "4.1."],
  ["2.4.2.",   "4.2."],
  ["2.4.3.",   "4.3."],
  ["2.4.4.",   "4.4."],
  ["2.5.1.",   "5.1."],
  ["2.5.2.",   "5.2."],
  ["2.5.3.",   "5.3."],
  ["2.5.4.",   "5.4."],
  ["2.5.5.",   "5.5."],
  ["2.5.6.",   "5.6."],
  // Restauration des sentinelles — les sous-sous-sections annonces/menage
  // retrouvent leur numérotation correcte "2.X.Y".
  ["\u0001SUB211\u0001", "2.1.1."],
  ["\u0001SUB212\u0001", "2.1.2."],
  ["\u0001SUB213\u0001", "2.1.3."],
  ["\u0001SUB251\u0001", "2.5.1."],
  ["\u0001SUB252\u0001", "2.5.2."],
  ["\u0001SUB253\u0001", "2.5.3."],
];
