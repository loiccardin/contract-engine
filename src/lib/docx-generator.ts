import * as fs from "fs";
import * as path from "path";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Header,
  Footer,
  PageNumber,
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
import { FONTS, FONT_SIZES, PAGE, SPACING, HEADER, FOOTER as FOOTER_STYLE, SIGNATURE } from "@/config/styles";

// ─── Image loading ───

function loadImage(filename: string): Buffer {
  const imgPath = path.join(process.cwd(), "public", "images", filename);
  return fs.readFileSync(imgPath);
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

/**
 * Parse le contenu texte brut d'un article en paragraphes DOCX.
 */
function parseContent(
  content: string,
  articleCode: string,
): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) continue;

    // Ligne "ARTICLE X" → titre bold
    if (isArticleHeader(trimmed)) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { before: SPACING.afterTitle, after: SPACING.afterTitle, line: SPACING.line },
          children: [
            new TextRun({ text: trimmed, font: FONTS.title, size: FONT_SIZES.articleTitle, bold: true }),
          ],
        })
      );
      continue;
    }

    // Sous-section numérotée (ex: "2.2.1.1. Services de ménage")
    if (isSubsectionTitle(trimmed)) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { before: SPACING.afterParagraph, after: SPACING.afterParagraph, line: SPACING.line },
          children: [
            new TextRun({ text: trimmed, font: FONTS.title, size: FONT_SIZES.articleTitle, bold: true }),
          ],
        })
      );
      continue;
    }

    // Ligne à puce
    if (isBulletLine(trimmed)) {
      const bulletText = parseBulletText(trimmed);
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 60, line: SPACING.line },
          indent: { left: 360 },
          children: [
            new TextRun({ text: "•  ", font: FONTS.body, size: FONT_SIZES.body }),
            new TextRun({ text: bulletText, font: FONTS.body, size: FONT_SIZES.body }),
          ],
        })
      );
      continue;
    }

    // Anchor tabs dans en_tete_proprietaire
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

      let foundAnchor = false;
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
          foundAnchor = true;
          break;
        }
      }
      if (foundAnchor) continue;
    }

    // Lignes en gras
    const isBoldLine =
      trimmed === "ENTRE LES SOUSSIGNÉS" ||
      trimmed === "LE PROPRIÉTAIRE" ||
      trimmed === "ET" ||
      trimmed.startsWith("LETAHOST LLC") ||
      trimmed === "D'UNE PART" ||
      trimmed === "D'AUTRE PART" ||
      trimmed.startsWith("IL EST PRÉALABLEMENT RAPPELÉ") ||
      trimmed.startsWith("CECI EXPOSÉ");

    // Lignes centrées — "PROMESSE DE CONTRAT" et "DE PRESTATION DE SERVICES" en 20pt
    // "CONCIERGERIE" en 10pt gras centré (pas 20pt)
    const isBigTitle =
      trimmed === "PROMESSE DE CONTRAT" ||
      trimmed === "DE PRESTATION DE SERVICES";

    const isSmallCenteredTitle = trimmed.startsWith("CONCIERGERIE");

    const isCentered = isBigTitle || isSmallCenteredTitle;
    const alignment = isCentered ? AlignmentType.CENTER : AlignmentType.JUSTIFIED;

    let fontSize: number = FONT_SIZES.body;
    if (isBigTitle) fontSize = FONT_SIZES.docTitle;
    if (isSmallCenteredTitle) fontSize = FONT_SIZES.subTitle;

    const isBold = isBoldLine || isCentered;

    paragraphs.push(
      new Paragraph({
        alignment,
        spacing: { after: SPACING.afterParagraph, line: SPACING.line },
        children: [
          new TextRun({
            text: trimmed,
            font: FONTS.body,
            size: fontSize,
            bold: isBold,
            underline: trimmed.startsWith("ENTRE LES SOUSSIGNÉS") || trimmed.startsWith("IL EST PRÉALABLEMENT") || trimmed.startsWith("CECI EXPOSÉ") ? {} : undefined,
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
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: SPACING.afterTitle, after: SPACING.afterParagraph, line: SPACING.line },
      children: [
        new TextRun({ text: "ARTICLE 9 - COMMENTAIRES", font: FONTS.title, size: FONT_SIZES.articleTitle, bold: true }),
      ],
    }),
    new Paragraph({
      border: {
        top: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
        bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
        left: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
        right: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
      },
      spacing: { after: 0, line: SPACING.line },
      children: [
        anchorTab("/cm1/"),
        new TextRun({ text: "", font: FONTS.body, size: FONT_SIZES.body }),
      ],
    }),
    ...Array.from({ length: 6 }, () =>
      new Paragraph({
        border: {
          left: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
          right: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
        },
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
    new Paragraph({
      spacing: { before: 200, line: SPACING.line },
      children: [
        anchorTab("/vi1/"),
        anchorTab("/dt1/"),
      ],
    }),
    new Paragraph({
      spacing: { before: 400, line: SPACING.line },
      children: [
        anchorTab("/sn1/"),
      ],
    })
  );

  paras.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new ImageRun({
          data: tamponImage,
          transformation: { width: SIGNATURE.tamponWidthPx, height: SIGNATURE.tamponHeightPx },
          type: "png",
        }),
      ],
    })
  );

  return paras;
}

function buildAnnexeTable(content: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: SPACING.afterTitle, after: SPACING.afterTitle, line: SPACING.line },
      children: [
        new TextRun({
          text: "ANNEXE 2 - GRILLE ESTIMATIVE MÉNAGE",
          font: FONTS.title,
          size: FONT_SIZES.articleTitle,
          bold: true,
          underline: {},
        }),
      ],
    })
  );

  const lines = content.split("\n").filter((l) => l.trim());
  const tableRows: TableRow[] = [];

  tableRows.push(
    new TableRow({
      children: [
        new TableCell({
          width: { size: 3000, type: WidthType.DXA },
          shading: { type: ShadingType.SOLID, color: "000000" },
          children: [new Paragraph({ children: [new TextRun({ text: "TYPOLOGIE", font: FONTS.body, size: 18, bold: true, color: "FFFFFF" })] })],
        }),
        new TableCell({
          width: { size: 2000, type: WidthType.DXA },
          shading: { type: ShadingType.SOLID, color: "000000" },
          children: [new Paragraph({ children: [new TextRun({ text: "SUPERFICIE", font: FONTS.body, size: 18, bold: true, color: "FFFFFF" })] })],
        }),
        new TableCell({
          width: { size: 4000, type: WidthType.DXA },
          shading: { type: ShadingType.SOLID, color: "000000" },
          children: [new Paragraph({ children: [new TextRun({ text: "FORFAIT [Ménage+Linge+Consommables]", font: FONTS.body, size: 18, bold: true, color: "FFFFFF" })] })],
        }),
      ],
    })
  );

  let currentType = "";
  let currentSize = "";
  for (const line of lines) {
    const trimmed = line.trim();

    if (
      trimmed.startsWith("ANNEXE") ||
      trimmed.startsWith("TYPOLOGIE") ||
      trimmed.startsWith("EXEMPLE") ||
      trimmed.startsWith("[Ménage") ||
      trimmed === "SUPERFICIE"
    ) continue;

    if (/^(Studio|T\d|T1\/T1bis)/.test(trimmed)) {
      currentType = trimmed;
      continue;
    }

    if (/^\d+\s*(seule|chambre)/.test(trimmed) || trimmed.startsWith(">")) {
      currentSize = trimmed;
      continue;
    }

    if (/^\d+-\d+m2/.test(trimmed) || /^>\s*\d+m2/.test(trimmed)) {
      currentSize = trimmed;
      continue;
    }

    const priceMatch = trimmed.match(/^(\d+\s*[Ll]its?\s*):?\s*$/);
    if (priceMatch) continue;

    const priceVal = trimmed.match(/^(\d+)\s*€$/);
    if (priceVal) {
      const prevLine = lines[lines.indexOf(line) - 1]?.trim() || "";
      const bedMatch = prevLine.match(/^(\d+)\s*[Ll]its?\s*:?/);
      const beds = bedMatch ? bedMatch[0].replace(/:$/, "").trim() : "";

      tableRows.push(
        new TableRow({
          children: [
            new TableCell({
              width: { size: 3000, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun({ text: currentType, font: FONTS.body, size: 18 })] })],
            }),
            new TableCell({
              width: { size: 2000, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun({ text: currentSize, font: FONTS.body, size: 18 })] })],
            }),
            new TableCell({
              width: { size: 4000, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun({ text: `${beds} : ${priceVal[1]}€`, font: FONTS.body, size: 18 })] })],
            }),
          ],
        })
      );
      currentType = "";
      currentSize = "";
      continue;
    }
  }

  if (tableRows.length > 1) {
    paragraphs.push(
      new Table({
        width: { size: 9000, type: WidthType.DXA },
        rows: tableRows,
      }) as unknown as Paragraph
    );
  } else {
    paragraphs.push(...parseContent(content, "annexe_2"));
  }

  return paragraphs;
}

// ─── Main generator ───

export async function generateDocx(
  assembledArticles: AssembledArticle[],
  contract: Contract
): Promise<Buffer> {
  void contract;
  const logoImage = loadImage("letahost-logo.png");
  const parapheImage = loadImage("paraphe-lc.jpeg");
  const tamponImage = loadImage("tampon-letahost.png");

  // Build all section children
  const children: Paragraph[] = [];

  for (const article of assembledArticles) {
    if (article.isPageBreakBefore) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }

    if (article.code === "art_9") {
      children.push(...buildCommentBox());
      continue;
    }

    if (article.code === "bloc_signature") {
      children.push(...buildSignatureBlock(article.content, tamponImage));
      continue;
    }

    if (article.code === "annexe_2") {
      children.push(...buildAnnexeTable(article.content));
      continue;
    }

    const contentParagraphs = parseContent(article.content, article.code);
    children.push(...contentParagraphs);
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
          default: new Header({
            children: [
              // Rectangle noir pleine largeur (bandeau) via image flottante behind document
              new Paragraph({
                children: [
                  // Bandeau noir : rectangle noir en arrière-plan, pleine largeur
                  new ImageRun({
                    data: logoImage,
                    transformation: {
                      width: HEADER.logoWidthPx,
                      height: HEADER.logoHeightPx,
                    },
                    type: "png",
                    floating: {
                      horizontalPosition: { align: "center" },
                      verticalPosition: {
                        offset: 114300, // ~1cm from top of header
                      },
                      allowOverlap: true,
                      behindDocument: false,
                    },
                  }),
                ],
              }),
              // Black banner paragraphs to create the background
              ...Array.from({ length: 4 }, () =>
                new Paragraph({
                  shading: { type: ShadingType.SOLID, color: "000000" },
                  spacing: { after: 0, line: 240 },
                  indent: { left: -PAGE.margin.left, right: -PAGE.margin.right },
                  children: [new TextRun({ text: " ", size: 4, color: "000000" })],
                })
              ),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [
                  // Paraphe LC — image flottante en bas à gauche
                  new ImageRun({
                    data: parapheImage,
                    transformation: {
                      width: FOOTER_STYLE.parapheWidthPx,
                      height: FOOTER_STYLE.parapheHeightPx,
                    },
                    type: "jpg",
                    floating: {
                      horizontalPosition: { offset: FOOTER_STYLE.parapheOffsetXEmu },
                      verticalPosition: { offset: -133350 },
                      allowOverlap: true,
                      behindDocument: false,
                    },
                  }),
                  // Anchor tab /ini1/ pour paraphe propriétaire DocuSign (invisible)
                  anchorTab("/ini1/"),
                ],
              }),
              // Page number centered: X/Y
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font: FONTS.body,
                    size: FONT_SIZES.body,
                  }),
                  new TextRun({ text: "/", font: FONTS.body, size: FONT_SIZES.body }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    font: FONTS.body,
                    size: FONT_SIZES.body,
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}
