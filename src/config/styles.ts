import { convertMillimetersToTwip, convertInchesToTwip } from "docx";

// Styles extraits du DOCX de référence P1.P.CJ
// Police : Arial — Corps : 10pt — Titres articles : 10pt Bold — Titre doc : 20pt Bold
// Interligne : 1.15 (276 twips) — Justification : both (justifié)
// Page : A4 — Marges : top 4.75cm, left/right/bottom 2.54cm

export const FONTS = {
  body: "Arial",
  title: "Arial",
} as const;

export const FONT_SIZES = {
  docTitle: 40,       // 20pt × 2 (half-points)
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
  line: 276,           // 1.15 interligne (240 = single)
  afterParagraph: 120, // ~6pt après chaque paragraphe
  afterTitle: 200,     // ~10pt après un titre
} as const;

// Header banner dimensions (rectangle noir bord à bord)
export const HEADER = {
  bannerWidth: 8086725,    // EMU (~21.3cm, déborde des marges)
  bannerHeight: 1471613,   // EMU (~3.88cm)
  bannerOffsetX: -1333499, // EMU (décalage gauche pour couvrir la marge)
  bannerOffsetY: -433387,  // EMU (décalage haut)
  logoWidth: convertMillimetersToTwip(50),  // ~5cm de large
  logoHeight: convertMillimetersToTwip(15), // ~1.5cm de haut
} as const;

// Footer paraphe dimensions
export const FOOTER = {
  parapheWidth: 497310,   // EMU (~1.3cm)
  parapheHeight: 413150,  // EMU (~1.1cm)
  parapheOffsetX: -571499, // EMU (dans la marge gauche)
} as const;

// Tampon signature dimensions
export const SIGNATURE = {
  tamponWidth: convertMillimetersToTwip(50),  // ~5cm
  tamponHeight: convertMillimetersToTwip(40), // ~4cm
} as const;

// Comment box dimensions
export const COMMENT_BOX = {
  height: convertMillimetersToTwip(50), // ~5cm
} as const;
