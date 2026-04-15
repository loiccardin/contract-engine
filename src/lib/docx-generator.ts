import * as fs from "fs";
import * as path from "path";
import JSZip from "jszip";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Header,
  Footer,
  ImageRun,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
} from "docx";
import { AssembledArticle, Contract } from "@/types";
import { FONTS, FONT_SIZES, PAGE, SPACING, SIGNATURE } from "@/config/styles";
import {
  CONTRAT_TEXT_REMAPPING,
  PROTECTED_REFERENCES,
  CONTRAT_TITLE_REMAPPING,
  CONTRAT_SUBTITLE_REMAPPING,
  CONTRAT_PLACEHOLDER,
} from "@/config/contrat-remapping";
import type { DocumentType } from "./contract-assembler";

// ─── File loading ───

function loadFile(relativePath: string): Buffer {
  return fs.readFileSync(path.join(process.cwd(), relativePath));
}

function loadTemplate(filename: string): Buffer {
  return loadFile(`src/templates/${filename}`);
}

function loadImage(filename: string): Buffer {
  return loadFile(`public/images/${filename}`);
}

// ─── Anchor tab (invisible white 1pt) ───
//
// État global du document en cours de génération (set par generateDocx).
// Permet aux fonctions internes (parseContent, anchorTab, buildSignatureBlock…)
// de savoir si on est en mode "promesse" (anchors actifs) ou "contrat"
// (anchors absents — pas de DocuSign).

let currentDocumentType: DocumentType = "promesse";

function anchorTab(tag: string): TextRun {
  if (currentDocumentType === "contrat") {
    // Pas d'anchor DocuSign sur les contrats — on retourne un run vide.
    return new TextRun({ text: "", font: FONTS.body, size: FONT_SIZES.body });
  }
  return new TextRun({ text: tag, font: FONTS.body, size: FONT_SIZES.anchorTab, color: "FFFFFF" });
}

// ─── Empty paragraph ───

function emptyParagraph(line: number = SPACING.lineBody): Paragraph {
  return new Paragraph({
    spacing: { after: 0, line },
    children: [new TextRun({ text: "", font: FONTS.body, size: FONT_SIZES.body })],
  });
}

// ─── Text classification ───

function isSubsectionTitle(line: string): boolean {
  return /^\d+\.\d+(\.\d+)*\.?\s/.test(line);
}

/**
 * Detect if a subsection line is a "title-only" line (just the number + short title)
 * vs a "number + paragraph" line (number followed by substantial text).
 * Rule: if the text after the number is > 60 chars, it's a paragraph (number bold, text normal).
 * Otherwise it's a title (all bold).
 */
function splitSubsectionLine(line: string): { number: string; rest: string; isTitleOnly: boolean } {
  const match = line.match(/^(\d+\.\d+(\.\d+)*\.?\s+)(.*)/);
  if (!match) return { number: "", rest: line, isTitleOnly: true };
  const num = match[1];
  const rest = match[3];
  return { number: num, rest, isTitleOnly: rest.length <= 60 };
}

function isBulletLine(line: string): boolean {
  const t = line.trimStart();
  return t.startsWith("* ") || t.startsWith("- ") || t.startsWith("— ") ||
    t.startsWith("· ") || t.startsWith("-\t") || t.startsWith("⁠");
}

function isArticleHeader(line: string): boolean {
  return /^ARTICLE\s+\d+/i.test(line);
}

function parseBulletText(line: string): string {
  return line.replace(/^[\s]*[*\-—·⁠]\s*/, "").trim();
}

// ─── Surlignage jaune des champs à remplir (contrats) ───

/**
 * Une ligne est à surligner si elle contient le placeholder standard
 * (em-dash + tirets) ou si c'est une ligne-label statique connue qui doit
 * être surlignée telle quelle (ex "Agissant en qualité…").
 */
const HIGHLIGHT_LABELS = [
  "Agissant en qualité d'Entrepreneur Individuel",
  "Adresse du/des LOGEMENT",
];

function shouldHighlightFieldLine(line: string): boolean {
  if (currentDocumentType !== "contrat") return false;
  if (line.includes("\u2014-")) return true; // em-dash + tiret = placeholder
  return HIGHLIGHT_LABELS.some((lbl) => line.startsWith(lbl));
}

// ─── Inline anchor markers (courte durée) ───
// /pl1/ = plages de location (rectangle 35px placé par DocuSign)
// /jr1/ = nombre de jours (text field inline)
const INLINE_ANCHOR_RE = /\/(pl1|jr1)\//g;

function hasInlineAnchor(line: string): boolean {
  return /\/(pl1|jr1)\//.test(line);
}

function isStandaloneAnchor(line: string, marker: string): boolean {
  return line.trim() === marker;
}

function renderInlineAnchorRuns(line: string, fontSize: number): TextRun[] {
  const re = new RegExp(INLINE_ANCHOR_RE.source, "g");
  const runs: TextRun[] = [];
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    if (m.index > lastIdx) {
      runs.push(new TextRun({ text: line.slice(lastIdx, m.index), font: FONTS.body, size: fontSize }));
    }
    runs.push(anchorTab(`/${m[1]}/`));
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < line.length) {
    runs.push(new TextRun({ text: line.slice(lastIdx), font: FONTS.body, size: fontSize }));
  }
  return runs;
}

// ─── Italic rendering for "la Partie" / "les Parties" ───

function renderWithItalics(text: string, fontSize: number, bold: boolean, underline: boolean): TextRun[] {
  const pattern = /(la Partie|les Parties)/g;
  const runs: TextRun[] = [];
  let lastIdx = 0;
  let m;

  while ((m = pattern.exec(text)) !== null) {
    if (m.index > lastIdx) {
      runs.push(new TextRun({
        text: text.slice(lastIdx, m.index), font: FONTS.body, size: fontSize, bold,
        underline: underline ? {} : undefined,
      }));
    }
    runs.push(new TextRun({
      text: m[1], font: FONTS.body, size: fontSize, bold, italics: true,
      underline: underline ? {} : undefined,
    }));
    lastIdx = m.index + m[0].length;
  }

  if (lastIdx < text.length || runs.length === 0) {
    runs.push(new TextRun({
      text: text.slice(lastIdx), font: FONTS.body, size: fontSize, bold,
      underline: underline ? {} : undefined,
    }));
  }

  return runs;
}

// ─── Parse content into paragraphs ───

interface ParseOptions {
  keepTogether: boolean;
  isOwnerFields?: boolean;
  /**
   * Compacte les paragraphes d'un bloc d'en-tête société (pas d'espace
   * après, interligne simple). Utilisé pour `en_tete_prestataire_contrat`
   * et le bloc société du `annexe_mandat_debours` pour que l'en-tête tienne
   * sur une page.
   */
  isCompactFields?: boolean;
  pageBreakBefore?: boolean;  // apply pageBreakBefore on the first paragraph
}

function parseContent(content: string, articleCode: string, opts: ParseOptions): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const lines = content.split("\n");
  const isOwner = articleCode === "en_tete_proprietaire";
  const isContrat = currentDocumentType === "contrat";
  // Interligne corps : 1.1 pour le contrat (264 twips, doc compact 27 pages),
  // 1.0 pour la promesse (240). `isCompactFields` prime sur l'owner.
  const lineSpacing = opts.isCompactFields
    ? SPACING.lineBody
    : isContrat
      ? 264
      : ((opts.isOwnerFields || isOwner) ? SPACING.lineFieldsOwner : SPACING.lineBody);
  // Contrat : espacements compacts pour respecter le gabarit du modèle.
  const afterNormal = isContrat ? 80 : SPACING.afterParagraph;
  const afterTitle = isContrat ? 140 : 60;
  const afterSubtitle = isContrat ? 80 : 60;

  let lastWasTitle = false;
  let lastWasEmpty = false;
  let needsPageBreakOnNext = opts.pageBreakBefore || false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    // Empty lines handling
    if (!trimmed) {
      // Skip empty lines that follow a title — prevents keepNext binding to empty paragraph
      if (lastWasTitle) continue;
      // En mode compact, collapse les lignes vides consécutives à une seule
      // pour que l'en-tête (propriétaire / prestataire / mandat) tienne.
      if (opts.isCompactFields && lastWasEmpty) continue;
      paragraphs.push(emptyParagraph(lineSpacing));
      lastWasEmpty = true;
      continue;
    }

    // Reset title/empty flags for non-empty lines
    lastWasTitle = false;
    lastWasEmpty = false;

    // FIX 3 + 5 — Titres d'articles principaux du contrat au format "N. TITRE…"
    // (9. PROTECTION, 11. SOUS-TRAITANCE, 12. DIVERS, 13. DROIT APPLICABLE).
    // Ces titres sortent des articles contrat_only (pas via buildContratSectionHeader
    // qui traite les all remappés). On les rend bold + gros spacing.before pour
    // créer le saut visuel entre articles.
    if (
      isContrat &&
      /^\d+\.\s+\S/.test(trimmed) &&
      !/^\d+\.\d/.test(trimmed) &&
      trimmed === trimmed.toUpperCase()
    ) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { before: 400, after: afterTitle, line: lineSpacing },
          keepNext: true, keepLines: true,
          pageBreakBefore: needsPageBreakOnNext || undefined,
          children: [new TextRun({ text: trimmed, font: FONTS.title, size: FONT_SIZES.articleTitle, bold: true })],
        })
      );
      needsPageBreakOnNext = false;
      lastWasTitle = true;
      continue;
    }

    // ARTICLE headers — keepNext + keepLines, space_before for separation
    if (isArticleHeader(trimmed)) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { before: 240, after: afterTitle, line: lineSpacing },
          keepNext: true, keepLines: true,
          pageBreakBefore: needsPageBreakOnNext || undefined,
          children: [new TextRun({ text: trimmed, font: FONTS.title, size: FONT_SIZES.articleTitle, bold: true })],
        })
      );
      needsPageBreakOnNext = false;
      lastWasTitle = true;
      continue;
    }

    // Subsection titles — 2 cases: title-only (all bold) or number+paragraph (number bold, text normal)
    if (isSubsectionTitle(trimmed)) {
      const { number, rest, isTitleOnly } = splitSubsectionLine(trimmed);

      // CORR 4 — pour les contrats, insère " - " entre le numéro et le texte
      // sur les sous-sous-sections 3-niveaux (2.1.1, 2.5.1, etc.) : produit
      // "2.1.1. - Services de ménage…" comme dans le modèle de référence.
      const isThreeLevel = /^\d+\.\d+\.\d+/.test(number);
      const needsDash = currentDocumentType === "contrat" && isThreeLevel;
      const titleText = needsDash ? `${number.trimEnd()} - ${rest}` : trimmed;
      const numberDisplay = needsDash ? `${number.trimEnd()} - ` : number;
      // FIX 4 — en mode contrat, TOUTES les sous-sections (2 et 3 niveaux)
      // sont rendues FULL BOLD selon le brief, quelle que soit la longueur
      // du texte. Les 2-niveaux courts (4.1. Commission) étaient déjà bold
      // via isTitleOnly ; cette règle étend le bold aux longs (5.2, 12.1, …).
      const forceTitleOnly = isContrat;
      const effectiveIsTitleOnly = isTitleOnly || forceTitleOnly;

      if (effectiveIsTitleOnly) {
        paragraphs.push(
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { before: 240, after: afterSubtitle, line: lineSpacing },
            keepNext: true, keepLines: true,
            pageBreakBefore: needsPageBreakOnNext || undefined,
            children: [new TextRun({ text: titleText, font: FONTS.title, size: FONT_SIZES.articleTitle, bold: true })],
          })
        );
        needsPageBreakOnNext = false;
        lastWasTitle = true;
      } else {
        paragraphs.push(
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { before: 240, after: afterNormal, line: lineSpacing },
            keepLines: opts.keepTogether,
            pageBreakBefore: needsPageBreakOnNext || undefined,
            children: [
              new TextRun({ text: numberDisplay, font: FONTS.title, size: FONT_SIZES.articleTitle, bold: true }),
              new TextRun({ text: rest, font: FONTS.body, size: FONT_SIZES.body }),
            ],
          })
        );
        needsPageBreakOnNext = false;
      }
      continue;
    }

    // Inline anchors /pl1/ et /jr1/ (variantes courte durée — art_2_3)
    // /pl1/ seul sur sa ligne → ligne dédiée d'anchor (DocuSign pose un rect 520×35)
    // /jr1/ ou /pl1/ inline dans une phrase → mix texte + anchor invisible
    if (hasInlineAnchor(trimmed)) {
      if (isStandaloneAnchor(trimmed, "/pl1/")) {
        // Ligne dédiée pour le rectangle DocuSign — espacement après pour réserver
        // visuellement la place du field rendu (~35px) et éviter les chevauchements.
        paragraphs.push(
          new Paragraph({
            spacing: { after: SPACING.afterParagraph, line: SPACING.lineBody },
            keepLines: opts.keepTogether,
            pageBreakBefore: needsPageBreakOnNext || undefined,
            children: [anchorTab("/pl1/")],
          }),
          emptyParagraph(lineSpacing)
        );
        needsPageBreakOnNext = false;
        continue;
      }
      // Inline (ex: "Soit /jr1/ jours")
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: SPACING.afterParagraph, line: lineSpacing },
          keepLines: opts.keepTogether,
          pageBreakBefore: needsPageBreakOnNext || undefined,
          children: renderInlineAnchorRuns(trimmed, FONT_SIZES.body),
        })
      );
      needsPageBreakOnNext = false;
      continue;
    }

    // Bullet lines → tiret long + hanging indent
    if (isBulletLine(trimmed)) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: SPACING.afterBullet, line: lineSpacing },
          indent: { left: 1080, hanging: 360 },
          pageBreakBefore: needsPageBreakOnNext || undefined,
          keepLines: opts.keepTogether,
          children: [
            new TextRun({ text: "●   ", font: FONTS.body, size: FONT_SIZES.body }),
            new TextRun({ text: parseBulletText(trimmed), font: FONTS.body, size: FONT_SIZES.body }),
          ],
        })
      );
      needsPageBreakOnNext = false;
      continue;
    }

    // Anchor tabs in en_tete_proprietaire — 2 runs: text 10pt + tag 1pt white
    if (isOwner) {
      const anchors: [string, string][] = [
        ["Nom et Prénoms ou Forme et Dénomination", "/nm1/"],
        ["Nom et Prénoms", "/nm1/"],
        ["dont le siège social est envisagé à", "/ss1/"],
        ["Adresse du domicile ou Siège social", "/ad1/"],
        ["Adresse du domicile", "/ad1/"],
        ["Date de naissance", "/dn1/"],
        ["Pays", "/py1/"],
        ["Téléphone", "/tl1/"],
        ["Mail", "/ml1/"],
        ["Adresse du/des LOGEMENT", "/lg1/"],
        ["Numéro SIREN", "/sr1/"],
        ["Représentée par", "/nm1/"],
      ];
      let found = false;
      for (const [prefix, tag] of anchors) {
        if (trimmed.startsWith(prefix)) {
          // CORR 7 — Mode contrat : pas d'anchor DocuSign, on injecte le
          // placeholder standard (em-dash + tirets) et on surligne la ligne
          // en jaune pour signaler à l'opératrice où remplir.
          if (currentDocumentType === "contrat") {
            if (tag === "/lg1/") {
              // Adresse logement : placeholder sur une ligne séparée, toutes deux surlignées
              paragraphs.push(
                new Paragraph({
                  alignment: AlignmentType.JUSTIFIED,
                  spacing: { after: 0, line: lineSpacing },
                  keepLines: opts.keepTogether,
                  children: [new TextRun({ text: trimmed, font: FONTS.body, size: FONT_SIZES.body, highlight: "yellow" })],
                }),
                new Paragraph({
                  spacing: { after: 0, line: lineSpacing },
                  children: [new TextRun({ text: CONTRAT_PLACEHOLDER, font: FONTS.body, size: FONT_SIZES.body, highlight: "yellow" })],
                })
              );
            } else if (prefix === "Représentée par") {
              const insertIdx = trimmed.indexOf("par ") + 4;
              const before = trimmed.slice(0, insertIdx);
              const after = trimmed.slice(insertIdx);
              paragraphs.push(
                new Paragraph({
                  alignment: AlignmentType.JUSTIFIED,
                  spacing: { after: 0, line: lineSpacing },
                  keepLines: opts.keepTogether,
                  children: [new TextRun({ text: `${before}${CONTRAT_PLACEHOLDER}${after}`, font: FONTS.body, size: FONT_SIZES.body, highlight: "yellow" })],
                })
              );
            } else {
              // Cas standard : "Champ : —--------------------------"
              const separator = trimmed.endsWith(":") ? " " : " : ";
              const text = trimmed.endsWith(":") ? `${trimmed} ${CONTRAT_PLACEHOLDER}` : `${trimmed}${separator}${CONTRAT_PLACEHOLDER}`;
              paragraphs.push(
                new Paragraph({
                  alignment: AlignmentType.JUSTIFIED,
                  spacing: { after: 0, line: lineSpacing },
                  keepLines: opts.keepTogether,
                  children: [new TextRun({ text, font: FONTS.body, size: FONT_SIZES.body, highlight: "yellow" })],
                })
              );
            }
            found = true;
            break;
          }
          // Special case: "Représentée par" → insert /nm1/ after "par "
          if (prefix === "Représentée par") {
            const insertIdx = trimmed.indexOf("par ") + 4;
            const before = trimmed.slice(0, insertIdx);
            const after = trimmed.slice(insertIdx);
            paragraphs.push(
              new Paragraph({
                alignment: AlignmentType.JUSTIFIED,
                spacing: { after: 0, line: lineSpacing },
                keepLines: opts.keepTogether,
                children: [
                  new TextRun({ text: before, font: FONTS.body, size: FONT_SIZES.body }),
                  anchorTab(tag),
                  new TextRun({ text: after, font: FONTS.body, size: FONT_SIZES.body }),
                ],
              })
            );
          } else if (tag === "/lg1/") {
            // /lg1/ on a separate line below the text so DocuSign places the field underneath
            paragraphs.push(
              new Paragraph({
                alignment: AlignmentType.JUSTIFIED,
                spacing: { after: 0, line: lineSpacing },
                keepLines: opts.keepTogether,
                children: [new TextRun({ text: trimmed, font: FONTS.body, size: FONT_SIZES.body })],
              }),
              new Paragraph({
                spacing: { after: 0, line: SPACING.lineBody },
                children: [anchorTab(tag)],
              })
            );
          } else {
            paragraphs.push(
              new Paragraph({
                alignment: AlignmentType.JUSTIFIED,
                spacing: { after: 0, line: lineSpacing },
                keepLines: opts.keepTogether,
                children: [
                  new TextRun({ text: trimmed + " ", font: FONTS.body, size: FONT_SIZES.body }),
                  anchorTab(tag),
                ],
              })
            );
          }
          found = true;
          break;
        }
      }
      if (found) continue;
    }

    // Anchor /lg2/ on "Adresse et description précise du/des LOGEMENT(s)" in preambule
    // /lg2/ on a separate line below so DocuSign places the field underneath
    if (articleCode === "preambule" && trimmed.startsWith("Adresse et description précise")) {
      const isContrat = currentDocumentType === "contrat";
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 0, line: lineSpacing },
          keepLines: opts.keepTogether,
          children: [new TextRun({ text: trimmed, font: FONTS.body, size: FONT_SIZES.body })],
        }),
        isContrat
          ? new Paragraph({
              spacing: { after: SPACING.afterParagraph, line: SPACING.lineBody },
              children: [new TextRun({ text: CONTRAT_PLACEHOLDER, font: FONTS.body, size: FONT_SIZES.body, highlight: "yellow" })],
            })
          : new Paragraph({
              spacing: { after: SPACING.afterParagraph, line: SPACING.lineBody },
              children: [anchorTab("/lg2/")],
            })
      );
      continue;
    }

    // Titres d'annexes — centrés, MAJUSCULES, bold. Appliqué uniquement aux
    // contrats : la promesse de référence rend "ANNEXE 1 : ÉQUIPEMENTS" en
    // justifié, on préserve ce comportement.
    if (currentDocumentType === "contrat" && /^ANNEXE\s+\d+\s*[-:–]/i.test(trimmed)) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 200, line: lineSpacing },
          keepNext: true, keepLines: true,
          pageBreakBefore: needsPageBreakOnNext || undefined,
          children: [new TextRun({ text: trimmed, font: FONTS.title, size: FONT_SIZES.articleTitle, bold: true, underline: {} })],
        })
      );
      needsPageBreakOnNext = false;
      lastWasTitle = true;
      continue;
    }

    // Bold structural lines
    const isBoldLine =
      trimmed === "ENTRE LES SOUSSIGNÉS" || trimmed === "LE PROPRIÉTAIRE" ||
      trimmed === "ET" || trimmed.startsWith("LETAHOST LLC") ||
      trimmed === "LE MANDANT" || trimmed === "LE MANDATAIRE" ||
      trimmed === "D'UNE PART" || trimmed === "D'AUTRE PART" ||
      trimmed.startsWith("IL EST PRÉALABLEMENT RAPPELÉ") || trimmed.startsWith("CECI EXPOSÉ");

    const isUnderlined =
      trimmed === "ENTRE LES SOUSSIGNÉS" || trimmed === "ET" ||
      trimmed.startsWith("IL EST PRÉALABLEMENT RAPPELÉ") || trimmed.startsWith("CECI EXPOSÉ");

    // Titre principal du document : grande taille (20pt) centré gras.
    // Cas spécial contrat : "CONCIERGERIE - ACTE ITÉRATIF -" est un sous-titre,
    // rendu en taille normale (10pt) centré gras.
    const isConciergerieSubtitle =
      trimmed.startsWith("CONCIERGERIE") && trimmed.includes("ACTE ITÉRATIF");
    const isBigTitle =
      trimmed === "PROMESSE DE CONTRAT" ||
      trimmed === "DE PRESTATION DE SERVICES" ||
      trimmed === "CONTRAT DE PRESTATIONS DE SERVICES" ||
      (trimmed.startsWith("CONCIERGERIE") && !isConciergerieSubtitle);
    const isCentered = isBigTitle || isConciergerieSubtitle;

    let fontSize: number = FONT_SIZES.body;
    if (isBigTitle) fontSize = FONT_SIZES.docTitle;
    // Le sous-titre "CONCIERGERIE - ACTE ITÉRATIF -" garde la taille body (10pt).

    const bold = isBoldLine || isCentered;
    const alignment = isCentered ? AlignmentType.CENTER : AlignmentType.JUSTIFIED;
    const hasItalic = trimmed.includes("la Partie") || trimmed.includes("les Parties");

    const highlight = shouldHighlightFieldLine(trimmed) ? "yellow" : undefined;
    const children = hasItalic
      ? renderWithItalics(trimmed, fontSize, bold, isUnderlined)
      : [new TextRun({ text: trimmed, font: FONTS.body, size: fontSize, bold, underline: isUnderlined ? {} : undefined, highlight })];

    // En mode compact, pas de gap après paragraphe sur les lignes de champs
    // (Nom société, Capital, RCS, …) — garde un gap normal sur les lignes
    // structurelles (ENTRE LES SOUSSIGNÉS, D'UNE PART, …).
    const isStructural = isBoldLine || isCentered;
    const hasPlaceholder = highlight === "yellow";
    // Contrat : lignes à remplir (placeholder) = after=0 (pas de gap inutile
    // entre deux champs consécutifs), cohérent avec le modèle de référence.
    const afterParagraph = (opts.isCompactFields && !isStructural) || (isContrat && hasPlaceholder)
      ? 0
      : afterNormal;
    // FIX 2 — "IL EST PRÉALABLEMENT RAPPELÉ QUE :" démarre le préambule.
    // En contrat, on force un saut de page pour éviter que le titre soit
    // orphelin en bas de la page 1 — le modèle le place en haut de page 2.
    const forcePageBreak = isContrat && trimmed.startsWith("IL EST PRÉALABLEMENT RAPPELÉ");
    // keepNext pour que ce titre reste collé au début du préambule.
    const keepNextStructural = isStructural;

    paragraphs.push(
      new Paragraph({
        alignment,
        spacing: { after: afterParagraph, line: lineSpacing },
        keepLines: opts.keepTogether,
        keepNext: keepNextStructural || undefined,
        pageBreakBefore: (needsPageBreakOnNext || forcePageBreak) || undefined,
        children,
      })
    );
    needsPageBreakOnNext = false;
  }

  return paragraphs;
}

// ─── Special articles ───

function buildCommentBox(): Paragraph[] {
  // Page text width = PAGE.width - left margin - right margin = 11909 - 1440 - 1440 = 9029 twips
  const textWidth = 9029;
  const borderStyle = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
  const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  return [
    new Paragraph({
      spacing: { before: 200, after: 100, line: SPACING.lineBody },
      keepNext: true, keepLines: true,
      children: [new TextRun({ text: "ARTICLE 9 - COMMENTAIRES", font: FONTS.title, size: FONT_SIZES.articleTitle, bold: true })],
    }),
    new Table({
      width: { size: textWidth, type: WidthType.DXA },
      borders: {
        top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle,
        insideHorizontal: noBorder, insideVertical: noBorder,
      },
      rows: [
        new TableRow({
          height: { value: 2268, rule: "atLeast" }, // ~4cm min height
          children: [
            new TableCell({
              width: { size: textWidth, type: WidthType.DXA },
              children: [
                new Paragraph({ spacing: { after: 0 }, children: [anchorTab("/cm1/")] }),
                ...Array.from({ length: 4 }, () =>
                  new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: " ", font: FONTS.body, size: FONT_SIZES.body })] })
                ),
              ],
            }),
          ],
        }),
      ],
    }) as unknown as Paragraph,
  ];
}

function buildSignatureBlock(content: string, tamponImage: Buffer, pageBreak: boolean = false): Paragraph[] {
  // Split content into lines and build paragraphs manually for the signature block
  // to inject /vi1/ and /dt1/ on the "Réputé fait à" line
  const lines = content.split("\n");
  const paras: Paragraph[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("Réputé fait à")) {
      // Insert /vi1/ right after "à " and /dt1/ right after "le : "
      // Markers are in their own tiny runs (white 2pt) but immediately adjacent
      const splitPoint = ", en deux originaux le :";
      const idx = trimmed.indexOf(splitPoint);
      const beforeSplit = idx >= 0 ? trimmed.slice(0, idx) : trimmed;
      const afterSplit = idx >= 0 ? trimmed.slice(idx) : "";
      paras.push(
        new Paragraph({
          spacing: { after: SPACING.afterParagraph, line: SPACING.lineBody },
          keepNext: true, keepLines: true,
          pageBreakBefore: pageBreak && paras.length === 0 ? true : undefined,
          children: [
            new TextRun({ text: beforeSplit, font: FONTS.body, size: FONT_SIZES.body }),
            anchorTab("/vi1/"),
            new TextRun({ text: afterSplit, font: FONTS.body, size: FONT_SIZES.body }),
            anchorTab("/dt1/"),
          ],
        })
      );
      pageBreak = false;
    } else {
      paras.push(
        new Paragraph({
          spacing: { after: SPACING.afterParagraph, line: SPACING.lineBody },
          keepNext: true, keepLines: true,
          pageBreakBefore: pageBreak && paras.length === 0 ? true : undefined,
          children: [new TextRun({ text: trimmed, font: FONTS.body, size: FONT_SIZES.body })],
        })
      );
      pageBreak = false;
    }
  }

  // /sn1/ on its own line below "Bon pour accord" (invisible en contrat via anchorTab)
  paras.push(
    new Paragraph({ spacing: { before: 200 }, keepNext: true, keepLines: true, children: [anchorTab("/sn1/")] }),
  );
  // Tampon LETAHOST — uniquement sur les promesses ; les contrats ont un
  // prestataire générique, pas LetaHost, donc pas de sceau préimprimé.
  if (currentDocumentType !== "contrat") {
    paras.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT, keepLines: true,
        children: [new ImageRun({ data: tamponImage, transformation: { width: SIGNATURE.tamponWidthPx, height: SIGNATURE.tamponHeightPx }, type: "png" })],
      })
    );
  }
  return paras;
}

function buildAnnexeTable(content: string, pageBreak: boolean = false): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  // Column widths to fill text area: 2800 + 2400 + 3829 = 9029 twips
  const col1 = 2800;
  const col2 = 2400;
  const col3 = 3829;
  const tableWidth = col1 + col2 + col3;

  // Titre "ANNEXE 2" pour les promesses, "ANNEXE 4" pour les contrats (après remap)
  const annexeTitle = currentDocumentType === "contrat"
    ? "ANNEXE 4 - GRILLE ESTIMATIVE MÉNAGE"
    : "ANNEXE 2 - GRILLE ESTIMATIVE MÉNAGE";

  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 200 },
      keepNext: true, keepLines: true,
      pageBreakBefore: pageBreak || undefined,
      children: [new TextRun({ text: annexeTitle, font: FONTS.title, size: FONT_SIZES.articleTitle, bold: true, underline: {} })],
    })
  );

  const lines = content.split("\n").filter((l) => l.trim());
  const tableRows: TableRow[] = [];

  // Header row — black background, white bold text, centered
  tableRows.push(
    new TableRow({
      children: [
        new TableCell({
          width: { size: col1, type: WidthType.DXA },
          shading: { type: ShadingType.SOLID, color: "000000" },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "TYPOLOGIE", font: FONTS.body, size: FONT_SIZES.body, bold: true, color: "FFFFFF" })] })],
        }),
        new TableCell({
          width: { size: col2, type: WidthType.DXA },
          shading: { type: ShadingType.SOLID, color: "000000" },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "SUPERFICIE", font: FONTS.body, size: FONT_SIZES.body, bold: true, color: "FFFFFF" })] })],
        }),
        new TableCell({
          width: { size: col3, type: WidthType.DXA },
          shading: { type: ShadingType.SOLID, color: "000000" },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "FORFAIT [Ménage+Linge+Consommables]", font: FONTS.body, size: FONT_SIZES.body, bold: true, color: "FFFFFF" })] })],
        }),
      ],
    })
  );

  // Parse data rows
  let currentType = "";
  let currentSize = "";
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("ANNEXE") || trimmed.startsWith("TYPOLOGIE") || trimmed.startsWith("EXEMPLE") || trimmed.startsWith("[Ménage") || trimmed === "SUPERFICIE") continue;
    if (/^(Studio|T\d|T1\/T1bis)/.test(trimmed)) { currentType = trimmed; continue; }
    if (/^\d+\s*(seule|chambre)/.test(trimmed) || trimmed.startsWith(">")) { currentSize = trimmed; continue; }
    if (/^\d+-\d+m2/.test(trimmed) || /^>\s*\d+m2/.test(trimmed)) { currentSize = trimmed; continue; }
    if (/^(\d+\s*[Ll]its?\s*):?\s*$/.test(trimmed)) continue;

    const priceVal = trimmed.match(/^(\d+)\s*€$/);
    if (priceVal) {
      const prevLine = lines[lines.indexOf(line) - 1]?.trim() || "";
      const bedMatch = prevLine.match(/^(\d+)\s*[Ll]its?\s*:?/);
      const beds = bedMatch ? bedMatch[0].replace(/:$/, "").trim() : "";
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({ width: { size: col1, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: currentType, font: FONTS.body, size: FONT_SIZES.body })] })] }),
            new TableCell({ width: { size: col2, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: currentSize, font: FONTS.body, size: FONT_SIZES.body })] })] }),
            new TableCell({ width: { size: col3, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: `${beds} : ${priceVal[1]}€`, font: FONTS.body, size: FONT_SIZES.body })] })] }),
          ],
        })
      );
      currentType = "";
      currentSize = "";
    }
  }

  if (tableRows.length > 1) {
    paragraphs.push(new Table({ width: { size: tableWidth, type: WidthType.DXA }, rows: tableRows }) as unknown as Paragraph);
  } else {
    paragraphs.push(...parseContent(content, "annexe_2", { keepTogether: false }));
  }

  return paragraphs;
}

// ─── Remapping texte pour contrats définitifs ───
//
// Protège d'abord les références Code civil/CGI listées dans
// PROTECTED_REFERENCES en les substituant par un sentinelle invisible, applique
// les transformations CONTRAT_TEXT_REMAPPING (ordonnées spécifique → général),
// puis restaure les références protégées.

function applyContratTextRemap(content: string): string {
  const protectedMap: Record<string, string> = {};
  let s = content;
  PROTECTED_REFERENCES.forEach((ref, i) => {
    if (!s.includes(ref)) return;
    const sentinel = `\u0000PROT${i}\u0000`;
    protectedMap[sentinel] = ref;
    s = s.split(ref).join(sentinel);
  });
  for (const [from, to] of CONTRAT_TEXT_REMAPPING) {
    s = s.split(from).join(to);
  }
  // Renumérotation des sous-titres dans le contenu (2.2.1. → 2.1., 2.4.1. → 4.1., …).
  // Appliqué après CONTRAT_TEXT_REMAPPING pour ne pas entrer en conflit avec les
  // transformations "paragraphe 2.2.1" (préfixées).
  for (const [from, to] of CONTRAT_SUBTITLE_REMAPPING) {
    s = s.split(from).join(to);
  }
  for (const [sentinel, original] of Object.entries(protectedMap)) {
    s = s.split(sentinel).join(original);
  }
  return s;
}

/**
 * Retire la première ligne non-vide d'un content si elle est un sous-titre
 * top-level "2.X." / "2.X" (ex "2.3. Obligations du propriétaire") —
 * redondant avec le header de section MAJUSCULES généré par
 * `buildContratSectionHeader`. Les sous-sous-titres 2.X.Y ne sont pas touchés.
 */
function stripRedundantTopTitle(content: string): string {
  const lines = content.split("\n");
  let i = 0;
  while (i < lines.length && lines[i].trim() === "") i++;
  if (i >= lines.length) return content;
  const first = lines[i].trim();
  // Matche "2.X." ou "2.X" (top-level) suivi d'un mot — exclut "2.X.Y"
  if (/^2\.\d+\.?\s+\S/.test(first) && !/^2\.\d+\.\d+/.test(first)) {
    lines.splice(i, 1);
    // Consomme aussi la ligne vide qui suivait le titre, pour éviter un gap
    if (i < lines.length && lines[i].trim() === "") lines.splice(i, 1);
    return lines.join("\n");
  }
  return content;
}

// ─── Header de section pour contrats (titres MAJUSCULES) ───

function buildContratSectionHeader(title: string, pageBreakBefore: boolean): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    // FIX 5 — 400 twips avant chaque titre d'article pour créer un saut visuel
    // net entre la fin de l'article précédent et le début du suivant.
    spacing: { before: 400, after: 140, line: SPACING.lineBody },
    keepNext: true, keepLines: true,
    pageBreakBefore: pageBreakBefore || undefined,
    children: [new TextRun({ text: title, font: FONTS.title, size: FONT_SIZES.articleTitle, bold: true })],
  });
}

// ─── Annexe SEPA — image pleine page ───

function buildSepaImageAnnexe(title: string, pageBreak: boolean): Paragraph[] {
  const sepaImage = loadImage("mandat-sepa.jpg");
  // L'image source fait 1224×1584 (ratio 1.294). Page A4 utile ≈ 160mm × 225mm.
  // On réduit la hauteur pour laisser la place au titre sur la même page :
  // 540px (largeur) × 700px (hauteur) conserve le ratio et tient confortablement.
  const widthPx = 540;
  const heightPx = 700;
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 200 },
      keepNext: true, keepLines: true,
      pageBreakBefore: pageBreak || undefined,
      children: [new TextRun({ text: title, font: FONTS.title, size: FONT_SIZES.articleTitle, bold: true, underline: {} })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      keepLines: true,
      children: [new ImageRun({ data: sepaImage, transformation: { width: widthPx, height: heightPx }, type: "jpg" })],
    }),
  ];
}

// ─── Auto-injection markers courte durée (art_2_3) ───

/**
 * Pour les variantes courte durée, Loïc écrit du texte normal dans l'éditeur —
 * il ne voit jamais les markers /pl1/ /jr1/. Le generator transforme :
 *
 *   1. Après la ligne contenant "les périodes suivantes" → insère un espace
 *      vide + /pl1/ invisible (blanc 2pt) pour y accrocher le rectangle
 *      DocuSign (~35px).
 *   2. Dans toute ligne "Soit (à compléter) jours" → remplace "(à compléter)"
 *      par /jr1/ invisible, pour y accrocher le champ nombre de jours inline.
 */
function injectCourteDureeMarkers(content: string): string {
  const lines = content.split("\n").map((line) =>
    /\bSoit\b.*\(à compléter\).*\bjours\b/i.test(line)
      ? line.replace(/\(à compléter\)/, "/jr1/")
      : line
  );

  for (let i = 0; i < lines.length; i++) {
    if (/les périodes suivantes\s*:?\s*$/i.test(lines[i].trim())) {
      // Réserve ~35px pour le rectangle DocuSign posé sur /pl1/.
      const insertBlock = ["", "", "/pl1/", "", ""];
      return [...lines.slice(0, i + 1), ...insertBlock, ...lines.slice(i + 1)].join("\n");
    }
  }
  return lines.join("\n");
}

// ─── Dynamic numbering ───

/**
 * Apply the assembler's dynamic sectionNumber to the article content.
 * - Finds the original number in the content (e.g., "2.2.5." for annonces)
 * - Replaces it with the new number (e.g., "2.2.3.")
 * - Also replaces sub-numbers (e.g., "2.2.5.1" → "2.2.3.1")
 * - If the content starts with a PARENT section title (e.g., "2.2. Services assurés")
 *   before the article's own number, it skips the parent and finds the right one.
 * - If no number is found, prefixes the first line.
 */
function applyDynamicNumbering(content: string, sectionNumber: string): string {
  const lines = content.split("\n");

  // Find the original number: scan lines for a subsection number at the same depth
  // sectionNumber is like "2.2.3" (3 parts) or "2.4.2" (3 parts)
  const targetDepth = sectionNumber.split(".").length; // e.g., 3 for "2.2.3"

  let originalNumber: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^(\d+\.\d+(\.\d+)*)\.?\s/);
    if (match) {
      const num = match[1];
      const numDepth = num.split(".").length;
      if (numDepth === targetDepth) {
        originalNumber = num;
        break;
      }
    }
  }

  if (originalNumber && originalNumber !== sectionNumber) {
    // Replace the original number and all its sub-numbers
    // e.g., "2.2.5" → "2.2.3", "2.2.5.1" → "2.2.3.1", "2.2.5.2" → "2.2.3.2"
    const escaped = originalNumber.replace(/\./g, "\\.");
    const regex = new RegExp(escaped, "g");
    return content.replace(regex, sectionNumber);
  }

  if (!originalNumber) {
    // No number found in content — prefix the first non-empty line
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim()) {
        lines[i] = `${sectionNumber}. ${lines[i].trim()}`;
        return lines.join("\n");
      }
    }
  }

  return content;
}

// ─── ZIP post-processing ───

async function injectTemplateHeaderFooter(docxBuffer: Buffer, documentType: DocumentType): Promise<Buffer> {
  const zip = await JSZip.loadAsync(docxBuffer);

  zip.file("word/header1.xml", loadTemplate("header1.xml"));
  zip.file("word/_rels/header1.xml.rels", loadTemplate("header1.xml.rels"));
  zip.file("word/media/image2.png", loadTemplate("logo-header.png"));

  if (documentType === "contrat") {
    // Pas de paraphe LC sur les contrats — footer = numéro de page uniquement.
    zip.file("word/footer1.xml", loadTemplate("footer1-contrat.xml"));
    zip.file("word/_rels/footer1.xml.rels", loadTemplate("footer1-contrat.xml.rels"));
  } else {
    // Promesse : footer standard avec paraphe LC + bandeau noir.
    zip.file("word/footer1.xml", loadTemplate("footer1.xml"));
    zip.file("word/_rels/footer1.xml.rels", loadTemplate("footer1.xml.rels"));
    zip.file("word/media/image5.png", loadTemplate("pixel-black.png"));
    zip.file("word/media/image1.jpg", loadTemplate("paraphe-footer.jpg"));
  }

  const result = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  return Buffer.from(result);
}

// ─── Main generator ───

export async function generateDocx(
  assembledArticles: AssembledArticle[],
  contract: Contract,
  documentType: DocumentType = "promesse"
): Promise<Buffer> {
  currentDocumentType = documentType;
  const tamponImage = loadImage("tampon-letahost.png");

  const children: Paragraph[] = [];

  for (const article of assembledArticles) {
    // Page break: insert a dedicated paragraph with pageBreakBefore
    // (mutating Paragraph after construction doesn't work with the docx lib)
    const needsPageBreak =
      article.isPageBreakBefore ||
      article.code === "bloc_signature" ||
      article.code === "annexe_1" ||
      article.code === "annexe_2";

    // Calcul du contenu transformé (numérotation dynamique → courte durée → remap contrat)
    let content = article.content;
    if (article.sectionNumber) {
      content = applyDynamicNumbering(content, article.sectionNumber);
    }
    if (article.code === "art_2_3" && contract.dureeType === "courte") {
      content = injectCourteDureeMarkers(content);
    }
    if (documentType === "contrat" && article.articleDocumentType !== "contrat_only") {
      // Les articles `contrat_only` sont déjà écrits avec la numérotation
      // et le vocabulaire du contrat — pas besoin (et danger) de remapper
      // leur "ANNEXE 1" en "ANNEXE 2".
      content = applyContratTextRemap(content);
    }

    // Article 9 — boîte commentaires : seulement pour les promesses
    if (article.code === "art_9") {
      if (documentType === "contrat") continue;
      if (needsPageBreak && children.length > 0) {
        children.push(new Paragraph({ pageBreakBefore: true, spacing: { after: 0, line: 240 }, children: [new TextRun({ text: "", size: 2 })] }));
      }
      children.push(...buildCommentBox());
    } else if (article.code === "bloc_signature") {
      children.push(...buildSignatureBlock(content, tamponImage, needsPageBreak));
    } else if (article.code === "annexe_2") {
      children.push(...buildAnnexeTable(content, needsPageBreak));
    } else if (documentType === "contrat" && article.code === "annexe_mandat_sepa") {
      // Annexe 3 — mandat SEPA : titre + image pleine page
      children.push(...buildSepaImageAnnexe("ANNEXE 3 : MANDAT SEPA", needsPageBreak));
    } else if (documentType === "contrat" && CONTRAT_TITLE_REMAPPING[article.code]) {
      // Header de section MAJUSCULES (RÉMUNÉRATION, OBLIGATIONS…) + corps
      // privé du sous-titre top-level redondant avec le header.
      children.push(buildContratSectionHeader(article.title, needsPageBreak && children.length > 0));
      const body = stripRedundantTopTitle(content);
      children.push(...parseContent(body, article.code, {
        keepTogether: article.keepTogether,
        isOwnerFields: article.code === "en_tete_proprietaire" && documentType !== "contrat",
        isCompactFields:
          (article.code === "en_tete_proprietaire" && documentType === "contrat") ||
          article.code === "en_tete_prestataire_contrat" ||
          article.code === "annexe_mandat_debours",
      }));
    } else {
      children.push(...parseContent(content, article.code, {
        keepTogether: article.keepTogether,
        isOwnerFields: article.code === "en_tete_proprietaire",
        pageBreakBefore: needsPageBreak && children.length > 0,
      }));
    }
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: PAGE.width, height: PAGE.height },
          margin: { top: PAGE.margin.top, bottom: PAGE.margin.bottom, left: PAGE.margin.left, right: PAGE.margin.right, header: PAGE.margin.header, footer: PAGE.margin.footer },
        },
      },
      headers: { default: new Header({ children: [new Paragraph({ children: [new TextRun({ text: " ", size: 2 })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ children: [new TextRun({ text: " ", size: 2 })] })] }) },
      children,
    }],
  });

  const rawBuffer = await Packer.toBuffer(doc);
  return await injectTemplateHeaderFooter(Buffer.from(rawBuffer), documentType);
}
