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

// ─── Anchor tab helper (invisible white 1pt) ───

function anchorTab(tag: string): TextRun {
  return new TextRun({
    text: tag,
    font: FONTS.body,
    size: FONT_SIZES.anchorTab,
    color: "FFFFFF",
  });
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

// ─── Italic detection for "la Partie" / "les Parties" ───

function renderLineWithItalics(text: string, fontSize: number, bold: boolean, underline: boolean): TextRun[] {
  // Detect "la Partie" and "les Parties" for italic rendering
  const italicPattern = /(la Partie|les Parties)/g;
  const runs: TextRun[] = [];
  let lastIndex = 0;
  let match;

  while ((match = italicPattern.exec(text)) !== null) {
    // Text before the match
    if (match.index > lastIndex) {
      runs.push(new TextRun({
        text: text.slice(lastIndex, match.index),
        font: FONTS.body, size: fontSize, bold,
        underline: underline ? {} : undefined,
      }));
    }
    // The italic part
    runs.push(new TextRun({
      text: match[1],
      font: FONTS.body, size: fontSize, bold, italics: true,
      underline: underline ? {} : undefined,
    }));
    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    runs.push(new TextRun({
      text: text.slice(lastIndex),
      font: FONTS.body, size: fontSize, bold,
      underline: underline ? {} : undefined,
    }));
  }

  if (runs.length === 0) {
    runs.push(new TextRun({
      text, font: FONTS.body, size: fontSize, bold,
      underline: underline ? {} : undefined,
    }));
  }

  return runs;
}

// ─── Parse content into paragraphs ───

interface ParseOptions {
  keepTogether: boolean;
  isOwnerFields?: boolean;  // en_tete_proprietaire fields → line spacing 1.5
}

function parseContent(content: string, articleCode: string, opts: ParseOptions): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const lines = content.split("\n");
  const isOwner = articleCode === "en_tete_proprietaire";
  const lineSpacing = (opts.isOwnerFields || isOwner) ? SPACING.lineFieldsOwner : SPACING.lineBody;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    // Empty lines → render as empty paragraph (preserve spacing from model)
    if (!trimmed) {
      paragraphs.push(emptyParagraph(lineSpacing));
      continue;
    }

    // ARTICLE headers — keepNext + keepLines, no extra spacing
    if (isArticleHeader(trimmed)) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { before: SPACING.afterTitle, after: SPACING.afterTitle, line: lineSpacing },
          keepNext: true,
          keepLines: true,
          children: [new TextRun({ text: trimmed, font: FONTS.title, size: FONT_SIZES.articleTitle, bold: true })],
        })
      );
      continue;
    }

    // Subsection titles — keepNext + keepLines, no extra spacing
    if (isSubsectionTitle(trimmed)) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { before: SPACING.afterTitle, after: SPACING.afterTitle, line: lineSpacing },
          keepNext: true,
          keepLines: true,
          children: [new TextRun({ text: trimmed, font: FONTS.title, size: FONT_SIZES.articleTitle, bold: true })],
        })
      );
      continue;
    }

    // Bullet lines → tiret long + hanging indent
    if (isBulletLine(trimmed)) {
      const bulletText = parseBulletText(trimmed);
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: SPACING.afterBullet, line: lineSpacing },
          indent: { left: 720, hanging: 360 },
          keepLines: opts.keepTogether,
          children: [
            new TextRun({ text: "-            ", font: FONTS.body, size: FONT_SIZES.body }),
            new TextRun({ text: bulletText, font: FONTS.body, size: FONT_SIZES.body }),
          ],
        })
      );
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

    // Title lines
    const isBigTitle = trimmed === "PROMESSE DE CONTRAT" || trimmed === "DE PRESTATION DE SERVICES";
    const isSmallCentered = trimmed.startsWith("CONCIERGERIE");
    const isCentered = isBigTitle || isSmallCentered;

    let fontSize: number = FONT_SIZES.body;
    if (isBigTitle) fontSize = FONT_SIZES.docTitle;

    const bold = isBoldLine || isCentered;
    const alignment = isCentered ? AlignmentType.CENTER : AlignmentType.JUSTIFIED;

    // Use italic-aware rendering for lines containing "la Partie" / "les Parties"
    const hasItalic = trimmed.includes("la Partie") || trimmed.includes("les Parties");

    if (hasItalic) {
      paragraphs.push(
        new Paragraph({
          alignment,
          spacing: { after: SPACING.afterParagraph, line: lineSpacing },
          keepLines: opts.keepTogether,
          children: renderLineWithItalics(trimmed, fontSize, bold, isUnderlined),
        })
      );
    } else {
      paragraphs.push(
        new Paragraph({
          alignment,
          spacing: { after: SPACING.afterParagraph, line: lineSpacing },
          keepLines: opts.keepTogether,
          children: [
            new TextRun({
              text: trimmed,
              font: FONTS.body,
              size: fontSize,
              bold,
              underline: isUnderlined ? {} : undefined,
            }),
          ],
        })
      );
    }
  }

  return paragraphs;
}

// ─── Special articles ───

function buildCommentBox(): Paragraph[] {
  return [
    new Paragraph({
      spacing: { before: 200, after: 100, line: SPACING.lineBody },
      keepNext: true,
      keepLines: true,
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

function buildSignatureBlock(content: string, tamponImage: Buffer): Paragraph[] {
  const paras = parseContent(content, "bloc_signature", { keepTogether: true });
  for (const p of paras) {
    (p as unknown as { keepNext: boolean }).keepNext = true;
  }

  paras.push(
    new Paragraph({ spacing: { before: 200 }, keepNext: true, keepLines: true, children: [anchorTab("/vi1/"), anchorTab("/dt1/")] }),
    new Paragraph({ spacing: { before: 400 }, keepNext: true, keepLines: true, children: [anchorTab("/sn1/")] }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      keepLines: true,
      children: [new ImageRun({ data: tamponImage, transformation: { width: SIGNATURE.tamponWidthPx, height: SIGNATURE.tamponHeightPx }, type: "png" })],
    })
  );
  return paras;
}

function buildAnnexeTable(content: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 200 },
      keepNext: true, keepLines: true,
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

// ─── ZIP post-processing: inject reference header/footer ───

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
    const needsPageBreak =
      article.isPageBreakBefore ||
      article.code === "bloc_signature" ||
      article.code === "annexe_1" ||
      article.code === "annexe_2";

    if (article.code === "art_9") {
      const box = buildCommentBox();
      if (needsPageBreak && box.length > 0) {
        (box[0] as unknown as { pageBreakBefore: boolean }).pageBreakBefore = true;
      }
      children.push(...box);
      continue;
    }

    if (article.code === "bloc_signature") {
      const sig = buildSignatureBlock(article.content, tamponImage);
      if (sig.length > 0) {
        (sig[0] as unknown as { pageBreakBefore: boolean }).pageBreakBefore = true;
      }
      children.push(...sig);
      continue;
    }

    if (article.code === "annexe_2") {
      const annexe = buildAnnexeTable(article.content);
      if (annexe.length > 0) {
        (annexe[0] as unknown as { pageBreakBefore: boolean }).pageBreakBefore = true;
      }
      children.push(...annexe);
      continue;
    }

    const paras = parseContent(article.content, article.code, {
      keepTogether: article.keepTogether,
      isOwnerFields: article.code === "en_tete_proprietaire",
    });

    if (needsPageBreak && paras.length > 0) {
      (paras[0] as unknown as { pageBreakBefore: boolean }).pageBreakBefore = true;
    }

    children.push(...paras);
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE.width, height: PAGE.height },
            margin: {
              top: PAGE.margin.top,
              bottom: PAGE.margin.bottom,
              left: PAGE.margin.left,
              right: PAGE.margin.right,
              header: PAGE.margin.header,
              footer: PAGE.margin.footer,
            },
          },
        },
        headers: {
          default: new Header({ children: [new Paragraph({ children: [new TextRun({ text: " ", size: 2 })] })] }),
        },
        footers: {
          default: new Footer({ children: [new Paragraph({ children: [new TextRun({ text: " ", size: 2 })] })] }),
        },
        children,
      },
    ],
  });

  const rawBuffer = await Packer.toBuffer(doc);
  const finalBuffer = await injectTemplateHeaderFooter(Buffer.from(rawBuffer));
  return finalBuffer;
}
