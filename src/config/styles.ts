import { convertMillimetersToTwip, convertInchesToTwip } from "docx";

// Styles extraits du DOCX de référence P1.P.CJ
// Police : Helvetica Neue — Corps : 10pt — Titres articles : 10pt Bold
// Interligne : simple (240) — Justification : both (justifié)
// Page : A4 — Marges : top 4.75cm, left/right/bottom 2.54cm

export const FONTS = {
  body: "Helvetica Neue",
  title: "Helvetica Neue",
} as const;

export const FONT_SIZES = {
  docTitle: 40,       // 20pt × 2 (half-points) — "PROMESSE DE CONTRAT" etc.
  subTitle: 20,       // 10pt × 2 — "CONCIERGERIE"
  articleTitle: 20,   // 10pt × 2
  body: 20,           // 10pt × 2
  anchorTab: 2,       // 1pt × 2 (invisible anchor tabs)
} as const;

export const PAGE = {
  width: 11909,       // A4 width in twips
  height: 16834,      // A4 height in twips
  margin: {
    top: convertMillimetersToTwip(47.5),    // 4.75cm
    bottom: convertInchesToTwip(1),          // 2.54cm
    left: convertInchesToTwip(1),            // 2.54cm
    right: convertInchesToTwip(1),           // 2.54cm
    header: convertInchesToTwip(0.5),        // 1.27cm
    footer: convertInchesToTwip(0.5),        // 1.27cm
  },
} as const;

export const SPACING = {
  lineBody: 240,            // interligne simple (1.0)
  lineFieldsOwner: 360,     // interligne 1.5 pour champs propriétaire
  afterParagraph: 200,      // ~10pt après paragraphe normal (12pt ≈ 240 twips, 10pt ≈ 200)
  afterBullet: 60,          // ~3pt après bullet
  afterTitle: 0,            // pas d'espacement propre sur les titres
} as const;

// Tampon signature dimensions
export const SIGNATURE = {
  tamponWidthPx: 180,   // ~5cm
  tamponHeightPx: 140,  // ~4cm
} as const;
