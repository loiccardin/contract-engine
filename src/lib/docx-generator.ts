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
  PageBreak,
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

// ─── Anchor tab helper ───

function anchorTab(tag: string): TextRun {
  return new TextRun({
    text: tag,
    font: FONTS.body,
    size: FONT_SIZES.anchorTab,
    color: "FFFFFF",
  });
}

// ─── Text parsing ───

function isSubsectionTitle(line: string): boolean {
  return /^\d+\.\d+(\.\d+)*\.?\s/.test(line);
}

function isBulletLine(line: string): boolean {
  const trimmed = line.trimStart();
  return (
    trimmed.startsWith("* ") ||
    trimmed.startsWith("- ") ||
    trimmed.startsWith("— ") ||
    trimmed.startsWith("· ") ||
    trimmed.startsWith("-\t") ||
    trimmed.startsWith("⁠")
  );
}

function isArticleHeader(line: string): boolean {
  return /^ARTICLE\s+\d+/i.test(line);
}

function parseBulletText(line: string): string {
  return line.replace(/^[\s]*[*\-—·⁠]\s*/, "").trim();
}

function parseContent(content: string, articleCode: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    if (isArticleHeader(trimmed)) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { before: SPACING.afterTitle, after: SPACING.afterTitle, line: SPACING.line },
          children: [new TextRun({ text: trimmed, font: FONTS.title, size: FONT_SIZES.articleTitle, bold: true })],
        })
      );
      continue;
    }

    if (isSubsectionTitle(trimmed)) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { before: SPACING.afterParagraph, after: SPACING.afterParagraph, line: SPACING.line },
          children: [new TextRun({ text: trimmed, font: FONTS.title, size: FONT_SIZES.articleTitle, bold: true })],
        })
      );
      continue;
    }

    if (isBulletLine(trimmed)) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 60, line: SPACING.line },
          indent: { left: 360 },
          children: [
            new TextRun({ text: "•  ", font: FONTS.body, size: FONT_SIZES.body }),
            new TextRun({ text: parseBulletText(trimmed), font: FONTS.body, size: FONT_SIZES.body }),
          ],
        })
      );
      continue;
    }

    // Anchor tabs in en_tete_proprietaire
    if (articleCode === "en_tete_proprietaire") {
      const anchors: [string, string][] = [
        ["Nom et Prénoms ou Forme et Dénomination", "/nm1/"],
        ["Nom et Prénoms", "/nm1/"],
        ["Adresse du domicile", "/ad1/"],
        ["Siège social", "/ad1/"],
        ["Date de naissance", "/dn1/"],
        ["Téléphone", "/tl1/"],
        ["Mail", "/ml1/"],
        ["Adresse du/des LOGEMENT", "/lg1/"],
      ];
      let found = false;
      for (const [prefix, tag] of anchors) {
        if (trimmed.startsWith(prefix)) {
          paragraphs.push(
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: SPACING.afterParagraph, line: SPACING.line },
              children: [
                new TextRun({ text: trimmed, font: FONTS.body, size: FONT_SIZES.body }),
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

    const isBoldLine =
      trimmed === "ENTRE LES SOUSSIGNÉS" ||
      trimmed === "LE PROPRIÉTAIRE" ||
      trimmed === "ET" ||
      trimmed.startsWith("LETAHOST LLC") ||
      trimmed === "D'UNE PART" ||
      trimmed === "D'AUTRE PART" ||
      trimmed.startsWith("IL EST PRÉALABLEMENT RAPPELÉ") ||
      trimmed.startsWith("CECI EXPOSÉ");

    const isBigTitle = trimmed === "PROMESSE DE CONTRAT" || trimmed === "DE PRESTATION DE SERVICES";
    const isSmallCentered = trimmed.startsWith("CONCIERGERIE");
    const isCentered = isBigTitle || isSmallCentered;

    let fontSize: number = FONT_SIZES.body;
    if (isBigTitle) fontSize = FONT_SIZES.docTitle;

    paragraphs.push(
      new Paragraph({
        alignment: isCentered ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
        spacing: { after: SPACING.afterParagraph, line: SPACING.line },
        children: [
          new TextRun({
            text: trimmed,
            font: FONTS.body,
            size: fontSize,
            bold: isBoldLine || isCentered,
            underline: (trimmed.startsWith("ENTRE LES SOUSSIGNÉS") || trimmed.startsWith("IL EST PRÉALABLEMENT") || trimmed.startsWith("CECI EXPOSÉ")) ? {} : undefined,
          }),
        ],
      })
    );
  }

  return paragraphs;
}

// ─── Special articles ───

function buildCommentBox(): Paragraph[] {
  return [
    new Paragraph({
      spacing: { before: SPACING.afterTitle, after: SPACING.afterParagraph, line: SPACING.line },
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
  const paras = parseContent(content, "bloc_signature");
  paras.push(
    new Paragraph({ spacing: { before: 200 }, children: [anchorTab("/vi1/"), anchorTab("/dt1/")] }),
    new Paragraph({ spacing: { before: 400 }, children: [anchorTab("/sn1/")] }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
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
      spacing: { before: SPACING.afterTitle, after: SPACING.afterTitle },
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
    paragraphs.push(...parseContent(content, "annexe_2"));
  }

  return paragraphs;
}

// ─── ZIP post-processing: inject reference header/footer ───

async function injectTemplateHeaderFooter(docxBuffer: Buffer): Promise<Buffer> {
  const zip = await JSZip.loadAsync(docxBuffer);

  // Load template assets
  const headerXml = loadTemplate("header1.xml");
  const footerXml = loadTemplate("footer1.xml");
  const headerRels = loadTemplate("header1.xml.rels");
  const footerRels = loadTemplate("footer1.xml.rels");
  const pixelBlack = loadTemplate("pixel-black.png");
  const logoHeader = loadTemplate("logo-header.png");
  const parapheFooter = loadTemplate("paraphe-footer.jpg");

  // Replace header and footer XML
  zip.file("word/header1.xml", headerXml);
  zip.file("word/footer1.xml", footerXml);
  zip.file("word/_rels/header1.xml.rels", headerRels);
  zip.file("word/_rels/footer1.xml.rels", footerRels);

  // Inject media files referenced by header/footer
  // header1.xml.rels: rId1 → image5.png (pixel noir), rId2 → image2.png (logo)
  // footer1.xml.rels: rId1 → image1.jpg (paraphe), rId2 → image5.png (pixel noir)
  zip.file("word/media/image5.png", pixelBlack);
  zip.file("word/media/image2.png", logoHeader);
  zip.file("word/media/image1.jpg", parapheFooter);

  // The docx lib already created headerReference/footerReference in sectPr
  // and the relationships in document.xml.rels — we just replaced the XML/media files

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
    if (article.isPageBreakBefore) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }

    if (article.code === "art_9") { children.push(...buildCommentBox()); continue; }
    if (article.code === "bloc_signature") { children.push(...buildSignatureBlock(article.content, tamponImage)); continue; }
    if (article.code === "annexe_2") { children.push(...buildAnnexeTable(article.content)); continue; }

    children.push(...parseContent(article.content, article.code));
  }

  // Generate DOCX with minimal header/footer (will be replaced)
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

  // Post-process: inject reference header/footer from template
  const finalBuffer = await injectTemplateHeaderFooter(Buffer.from(rawBuffer));
  return finalBuffer;
}
