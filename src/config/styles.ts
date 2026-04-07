import { convertMillimetersToTwip, convertInchesToTwip } from "docx";

// Styles extraits du DOCX de référence P1.P.CJ
// Police : Helvetica Neue — Corps : 10pt — Titres articles : 10pt Bold — Titre doc : 20pt Bold
// Interligne : 1.15 (276 twips) — Justification : both (justifié)
// Page : A4 — Marges : top 4.75cm, left/right/bottom 2.54cm

export const FONTS = {
  body: "Helvetica Neue",
  title: "Helvetica Neue",
} as const;

export const FONT_SIZES = {
  docTitle: 40,       // 20pt × 2 (half-points)
  subTitle: 20,       // 10pt × 2 (CONCIERGERIE)
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

// Header banner: 2 rectangles noirs 8.84" × 1.61" + logo 1.95" × 1.52" centré
export const HEADER = {
  bannerWidthEmu: 8086725,     // EMU (~22.5cm, pleine largeur bord à bord)
  bannerHeightEmu: 1471613,    // EMU (~4.1cm)
  bannerOffsetXEmu: -1333499,  // EMU (décalage gauche pour déborder de la marge)
  bannerOffsetYEmu: -433387,   // EMU (décalage haut)
  logoWidthPx: 140,            // ~5cm / 1.95"
  logoHeightPx: 109,           // ~3.9cm / 1.52"
} as const;

// Footer paraphe dimensions
export const FOOTER = {
  parapheWidthPx: 40,     // ~1.5cm
  parapheHeightPx: 33,    // ~1.2cm
  parapheOffsetXEmu: -571499, // EMU (dans la marge gauche)
} as const;

// Tampon signature dimensions
export const SIGNATURE = {
  tamponWidthPx: 180,   // ~5cm
  tamponHeightPx: 140,  // ~4cm
} as const;

// Comment box dimensions
export const COMMENT_BOX = {
  height: convertMillimetersToTwip(50), // ~5cm
} as const;
