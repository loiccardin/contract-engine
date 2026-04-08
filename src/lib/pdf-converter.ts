import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

/**
 * Détecte le chemin du binaire LibreOffice selon l'OS.
 */
function getLibreOfficeBin(): string {
  if (process.platform === "darwin") {
    return "/Applications/LibreOffice.app/Contents/MacOS/soffice";
  }
  // Linux (Railway) — dans le PATH
  return "libreoffice";
}

/**
 * Convertit un buffer DOCX en buffer PDF via LibreOffice headless.
 * Timeout : 30 secondes.
 */
export async function convertDocxToPdf(docxBuffer: Buffer): Promise<Buffer> {
  const uuid = crypto.randomUUID();
  const tmpDir = "/tmp";
  const docxPath = path.join(tmpDir, `${uuid}.docx`);
  const pdfPath = path.join(tmpDir, `${uuid}.pdf`);

  try {
    // 1. Écrire le DOCX temporaire
    fs.writeFileSync(docxPath, docxBuffer);

    // 2. Convertir via LibreOffice headless
    const bin = getLibreOfficeBin();
    const cmd = `${bin} --headless --convert-to pdf --outdir ${tmpDir} ${docxPath}`;

    execSync(cmd, {
      timeout: 30000,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, HOME: tmpDir }, // LibreOffice a besoin d'un HOME writable
    });

    // 3. Lire le PDF résultant
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`PDF non généré : ${pdfPath} introuvable après conversion`);
    }

    return fs.readFileSync(pdfPath);
  } catch (error) {
    if (error instanceof Error && error.message.includes("ETIMEDOUT")) {
      throw new Error("Conversion DOCX → PDF timeout (>30s)");
    }
    throw new Error(`Conversion DOCX → PDF échouée : ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    // 4. Nettoyage
    try { fs.unlinkSync(docxPath); } catch { /* ignore */ }
    try { fs.unlinkSync(pdfPath); } catch { /* ignore */ }
  }
}
