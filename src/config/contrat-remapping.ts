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
  ["Annexe 1",           "Annexe 2"],
  ["Annexe 2",           "Annexe 4"],

  // B) Reformulations textuelles
  ["envisage de confier",                "entend confier"],
  ["Contrat de Prestation de Services",  "présent Contrat"],

  // C) Titre du document
  ["PROMESSE DE CONTRAT",        "CONTRAT DE PRESTATIONS DE SERVICES"],
  ["DE PRESTATION DE SERVICES",  ""],
  ["CONCIERGERIE",               "CONCIERGERIE - ACTE ITÉRATIF -"],
];

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
