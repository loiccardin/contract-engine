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

function anchorTab(tag: string): TextRun {
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
  pageBreakBefore?: boolean;  // apply pageBreakBefore on the first paragraph
}

function parseContent(content: string, articleCode: string, opts: ParseOptions): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const lines = content.split("\n");
  const isOwner = articleCode === "en_tete_proprietaire";
  const lineSpacing = (opts.isOwnerFields || isOwner) ? SPACING.lineFieldsOwner : SPACING.lineBody;

  let lastWasTitle = false;
  let needsPageBreakOnNext = opts.pageBreakBefore || false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    // Empty lines handling
    if (!trimmed) {
      // Skip empty lines that follow a title — prevents keepNext binding to empty paragraph
      if (lastWasTitle) continue;
      paragraphs.push(emptyParagraph(lineSpacing));
      continue;
    }

    // Reset title flag for non-empty lines
    lastWasTitle = false;

    // ARTICLE headers — keepNext + keepLines, space_before for separation
    if (isArticleHeader(trimmed)) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { before: 240, after: 60, line: lineSpacing },
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

      if (isTitleOnly) {
        paragraphs.push(
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { before: 240, after: 60, line: lineSpacing },
            keepNext: true, keepLines: true,
            pageBreakBefore: needsPageBreakOnNext || undefined,
            children: [new TextRun({ text: trimmed, font: FONTS.title, size: FONT_SIZES.articleTitle, bold: true })],
          })
        );
        needsPageBreakOnNext = false;
        lastWasTitle = true;
      } else {
        paragraphs.push(
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { before: 240, after: SPACING.afterParagraph, line: lineSpacing },
            keepLines: opts.keepTogether,
            pageBreakBefore: needsPageBreakOnNext || undefined,
            children: [
              new TextRun({ text: number, font: FONTS.title, size: FONT_SIZES.articleTitle, bold: true }),
              new TextRun({ text: rest, font: FONTS.body, size: FONT_SIZES.body }),
            ],
          })
        );
        needsPageBreakOnNext = false;
      }
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
            new TextRun({ text: "-            ", font: FONTS.body, size: FONT_SIZES.body }),
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
        ["Adresse du domicile", "/ad1/"],
        ["Siège social", "/ad1/"],
        ["Date de naissance", "/dn1/"],
        ["Téléphone", "/tl1/"],
        ["Mail", "/ml1/"],
        ["Adresse du/des LOGEMENT", "/lg1/"],
        ["Numéro SIREN", "/ad1/"],
        ["Représentée par", "/nm1/"],
      ];
      let found = false;
      for (const [prefix, tag] of anchors) {
        if (trimmed.startsWith(prefix)) {
          paragraphs.push(
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 0, line: SPACING.lineFieldsOwner },
              keepLines: opts.keepTogether,
              children: [
                new TextRun({ text: trimmed + " ", font: FONTS.body, size: FONT_SIZES.body }),
                anchorTab(tag),
              ],
            })
          );
          found = true;
          break;
        }
      }
      if (found) continue;
    }

    // Bold structural lines
    const isBoldLine =
      trimmed === "ENTRE LES SOUSSIGNÉS" || trimmed === "LE PROPRIÉTAIRE" ||
      trimmed === "ET" || trimmed.startsWith("LETAHOST LLC") ||
      trimmed === "D'UNE PART" || trimmed === "D'AUTRE PART" ||
      trimmed.startsWith("IL EST PRÉALABLEMENT RAPPELÉ") || trimmed.startsWith("CECI EXPOSÉ");

    const isUnderlined =
      trimmed === "ENTRE LES SOUSSIGNÉS" || trimmed === "ET" ||
      trimmed.startsWith("IL EST PRÉALABLEMENT RAPPELÉ") || trimmed.startsWith("CECI EXPOSÉ");

    const isBigTitle = trimmed === "PROMESSE DE CONTRAT" || trimmed === "DE PRESTATION DE SERVICES" || trimmed.startsWith("CONCIERGERIE");
    const isCentered = isBigTitle;

    let fontSize: number = FONT_SIZES.body;
    if (isBigTitle) fontSize = FONT_SIZES.docTitle;

    const bold = isBoldLine || isCentered;
    const alignment = isCentered ? AlignmentType.CENTER : AlignmentType.JUSTIFIED;
    const hasItalic = trimmed.includes("la Partie") || trimmed.includes("les Parties");

    const children = hasItalic
      ? renderWithItalics(trimmed, fontSize, bold, isUnderlined)
      : [new TextRun({ text: trimmed, font: FONTS.body, size: fontSize, bold, underline: isUnderlined ? {} : undefined })];

    paragraphs.push(
      new Paragraph({
        alignment,
        spacing: { after: SPACING.afterParagraph, line: lineSpacing },
        keepLines: opts.keepTogether,
        pageBreakBefore: needsPageBreakOnNext || undefined,
        children,
      })
    );
    needsPageBreakOnNext = false;
  }

  return paragraphs;
}

// ─── Special articles ───

function buildCommentBox(): Paragraph[] {
  return [
    new Paragraph({
      spacing: { before: 200, after: 100, line: SPACING.lineBody },
      keepNext: true, keepLines: true,
      children: [new TextRun({ text: "ARTICLE 9 - COMMENTAIRES", font: FONTS.title, size: FONT_SIZES.articleTitle, bold: true })],
    }),
    new Paragraph({
      border: {
        top: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
        bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
        left: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
        right: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
      },
      spacing: { after: 0 },
      children: [anchorTab("/cm1/"), new TextRun({ text: "", font: FONTS.body, size: FONT_SIZES.body })],
    }),
    ...Array.from({ length: 6 }, () =>
      new Paragraph({
        border: { left: { style: BorderStyle.SINGLE, size: 6, color: "000000" }, right: { style: BorderStyle.SINGLE, size: 6, color: "000000" } },
        children: [new TextRun({ text: " ", font: FONTS.body, size: FONT_SIZES.body })],
      })
    ),
    new Paragraph({
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
        left: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
        right: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
      },
      spacing: { after: SPACING.afterParagraph },
      children: [new TextRun({ text: " ", font: FONTS.body, size: FONT_SIZES.body })],
    }),
  ];
}

function buildSignatureBlock(content: string, tamponImage: Buffer, pageBreak: boolean = false): Paragraph[] {
  const paras = parseContent(content, "bloc_signature", { keepTogether: true, pageBreakBefore: pageBreak });
  // keepNext on ALL paragraphs so the block stays together on one page
  for (const p of paras) {
    (p as unknown as { keepNext: boolean }).keepNext = true;
    (p as unknown as { keepLines: boolean }).keepLines = true;
  }

  paras.push(
    new Paragraph({ spacing: { before: 200 }, keepNext: true, keepLines: true, children: [anchorTab("/vi1/"), anchorTab("/dt1/")] }),
    new Paragraph({ spacing: { before: 400 }, keepNext: true, keepLines: true, children: [anchorTab("/sn1/")] }),
    new Paragraph({
      alignment: AlignmentType.RIGHT, keepLines: true,
      children: [new ImageRun({ data: tamponImage, transformation: { width: SIGNATURE.tamponWidthPx, height: SIGNATURE.tamponHeightPx }, type: "png" })],
    })
  );
  return paras;
}

function buildAnnexeTable(content: string, pageBreak: boolean = false): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 200 },
      keepNext: true, keepLines: true,
      pageBreakBefore: pageBreak || undefined,
      children: [new TextRun({ text: "ANNEXE 2 - GRILLE ESTIMATIVE MÉNAGE", font: FONTS.title, size: FONT_SIZES.articleTitle, bold: true, underline: {} })],
    })
  );

  const lines = content.split("\n").filter((l) => l.trim());
  const tableRows: TableRow[] = [];

  tableRows.push(
    new TableRow({
      children: [
        new TableCell({ width: { size: 3000, type: WidthType.DXA }, shading: { type: ShadingType.SOLID, color: "000000" }, children: [new Paragraph({ children: [new TextRun({ text: "TYPOLOGIE", font: FONTS.body, size: 18, bold: true, color: "FFFFFF" })] })] }),
        new TableCell({ width: { size: 2000, type: WidthType.DXA }, shading: { type: ShadingType.SOLID, color: "000000" }, children: [new Paragraph({ children: [new TextRun({ text: "SUPERFICIE", font: FONTS.body, size: 18, bold: true, color: "FFFFFF" })] })] }),
        new TableCell({ width: { size: 4000, type: WidthType.DXA }, shading: { type: ShadingType.SOLID, color: "000000" }, children: [new Paragraph({ children: [new TextRun({ text: "FORFAIT [Ménage+Linge+Consommables]", font: FONTS.body, size: 18, bold: true, color: "FFFFFF" })] })] }),
      ],
    })
  );

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
            new TableCell({ width: { size: 3000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: currentType, font: FONTS.body, size: 18 })] })] }),
            new TableCell({ width: { size: 2000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: currentSize, font: FONTS.body, size: 18 })] })] }),
            new TableCell({ width: { size: 4000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: `${beds} : ${priceVal[1]}€`, font: FONTS.body, size: 18 })] })] }),
          ],
        })
      );
      currentType = "";
      currentSize = "";
    }
  }

  if (tableRows.length > 1) {
    paragraphs.push(new Table({ width: { size: 9000, type: WidthType.DXA }, rows: tableRows }) as unknown as Paragraph);
  } else {
    paragraphs.push(...parseContent(content, "annexe_2", { keepTogether: false }));
  }

  return paragraphs;
}

// ─── ZIP post-processing ───

async function injectTemplateHeaderFooter(docxBuffer: Buffer): Promise<Buffer> {
  const zip = await JSZip.loadAsync(docxBuffer);

  zip.file("word/header1.xml", loadTemplate("header1.xml"));
  zip.file("word/footer1.xml", loadTemplate("footer1.xml"));
  zip.file("word/_rels/header1.xml.rels", loadTemplate("header1.xml.rels"));
  zip.file("word/_rels/footer1.xml.rels", loadTemplate("footer1.xml.rels"));
  zip.file("word/media/image5.png", loadTemplate("pixel-black.png"));
  zip.file("word/media/image2.png", loadTemplate("logo-header.png"));
  zip.file("word/media/image1.jpg", loadTemplate("paraphe-footer.jpg"));

  const result = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  return Buffer.from(result);
}

// ─── Main generator ───

export async function generateDocx(
  assembledArticles: AssembledArticle[],
  contract: Contract
): Promise<Buffer> {
  void contract;
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

    if (article.code === "art_9") {
      // Comment box: pageBreak via dedicated paragraph if needed
      if (needsPageBreak && children.length > 0) {
        children.push(new Paragraph({ pageBreakBefore: true, spacing: { after: 0, line: 240 }, children: [new TextRun({ text: "", size: 2 })] }));
      }
      children.push(...buildCommentBox());
    } else if (article.code === "bloc_signature") {
      children.push(...buildSignatureBlock(article.content, tamponImage, needsPageBreak));
    } else if (article.code === "annexe_2") {
      children.push(...buildAnnexeTable(article.content, needsPageBreak));
    } else {
      children.push(...parseContent(article.content, article.code, {
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
  return await injectTemplateHeaderFooter(Buffer.from(rawBuffer));
}
