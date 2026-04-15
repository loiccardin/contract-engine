import { google, drive_v3 } from "googleapis";
import { Readable } from "stream";

// ─── Nomenclature mapping ───

const FILE_NAMES: Record<string, string> = {
  "P1.P.CJ": "P1.P.CJ - Promesse contrat de conciergerie - Zones Classiques et Jaunes - Société en cours de formation",
  "P1.P.R":  "P1.P.R - Promesse contrat de conciergerie - Zones Rouges - Société en cours de formation",
  "P1.S.CJ": "P1.S.CJ - Promesse contrat de conciergerie - Zones Classiques et Jaunes - Société déjà existante",
  "P1.S.R":  "P1.S.R - Promesse contrat de conciergerie - Zones Rouges - Société déjà existante",
  "P2.P":    "P2.P - Promesse contrat de conciergerie - Société en cours de formation - Sans ménage et sans blanchisserie",
  "P2.S":    "P2.S - Promesse contrat de conciergerie - Société déjà existante - Sans ménage et sans blanchisserie",
  "P3.P.CJ": "P3.P.CJ - Promesse contrat de conciergerie - Zones Classiques et Jaunes - Société en cours de formation - Studio",
  "P3.P.R":  "P3.P.R - Promesse contrat de conciergerie - Zones Rouges - Société en cours de formation - Studio",
  "P3.S.CJ": "P3.S.CJ - Promesse contrat de conciergerie - Zones Classiques et Jaunes - Société déjà existante - Studio",
  "P3.S.R":  "P3.S.R - Promesse contrat de conciergerie - Zones Rouges - Société déjà existante - Studio",
  "P4.P":    "P4.P - Promesse contrat de conciergerie - Société en cours de formation - Sans ménage et sans blanchisserie - Studio",
  "P4.S":    "P4.S - Promesse contrat de conciergerie - Société déjà existante - Sans ménage et sans blanchisserie - Studio",
  "P5.P.CJ": "P5.P.CJ - Promesse contrat de conciergerie - Zones Classiques et Jaunes - Société en cours de formation - 20%",
  "P5.P.R":  "P5.P.R - Promesse contrat de conciergerie - Zones Rouges - Société en cours de formation - 20%",
  "P5.S.CJ": "P5.S.CJ - Promesse contrat de conciergerie - Zones Classiques et Jaunes - Société déjà existante - 20%",
  "P5.S.R":  "P5.S.R - Promesse contrat de conciergerie - Zones Rouges - Société déjà existante - 20%",
  "P6.P":    "P6.P - Promesse contrat de conciergerie - Société en cours de formation - Sans ménage et sans blanchisserie - 20%",
  "P6.S":    "P6.S - Promesse contrat de conciergerie - Société déjà existante - Sans ménage et sans blanchisserie - 20%",
};

export function getFileName(code: string): string {
  return FILE_NAMES[code] || code;
}

// ─── Auth ───

function initDriveClient(): drive_v3.Drive {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyJson) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY non configurée");

  const key = JSON.parse(keyJson);
  const auth = new google.auth.GoogleAuth({
    credentials: key,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  return google.drive({ version: "v3", auth });
}

// ─── Archive ───

export async function archiveCurrentFolders(): Promise<string[]> {
  const drive = initDriveClient();
  const rootId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  const archiveId = process.env.GOOGLE_DRIVE_ARCHIVE_FOLDER_ID;
  if (!rootId || !archiveId) throw new Error("GOOGLE_DRIVE_ROOT_FOLDER_ID ou ARCHIVE_FOLDER_ID manquant");

  // Find folders containing "(en cours)" in root
  const res = await drive.files.list({
    q: `'${rootId}' in parents and mimeType = 'application/vnd.google-apps.folder' and name contains '(en cours)' and trashed = false`,
    fields: "files(id, name)",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const archived: string[] = [];

  for (const folder of res.data.files || []) {
    if (!folder.id || !folder.name) continue;

    // Rename: remove " (en cours)"
    const newName = folder.name.replace(" (en cours)", "");

    // Move to archive folder (remove from root, add to archive)
    await drive.files.update({
      fileId: folder.id,
      addParents: archiveId,
      removeParents: rootId,
      requestBody: { name: newName },
      supportsAllDrives: true,
    });

    archived.push(newName);
  }

  return archived;
}

// ─── Create output folders ───

export async function createOutputFolders(dateStr: string): Promise<{ docsFolderId: string; pdfFolderId: string }> {
  const drive = initDriveClient();
  const rootId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  if (!rootId) throw new Error("GOOGLE_DRIVE_ROOT_FOLDER_ID manquant");

  const docsFolder = await drive.files.create({
    requestBody: {
      name: `MODELES PROMESSES - MAJ DU ${dateStr} (en cours)`,
      mimeType: "application/vnd.google-apps.folder",
      parents: [rootId],
    },
    fields: "id",
    supportsAllDrives: true,
  });

  const pdfFolder = await drive.files.create({
    requestBody: {
      name: `MODELES PROMESSES EN PDF - MAJ DU ${dateStr} (en cours)`,
      mimeType: "application/vnd.google-apps.folder",
      parents: [rootId],
    },
    fields: "id",
    supportsAllDrives: true,
  });

  if (!docsFolder.data.id || !pdfFolder.data.id) {
    throw new Error("Échec création dossiers Drive");
  }

  return {
    docsFolderId: docsFolder.data.id,
    pdfFolderId: pdfFolder.data.id,
  };
}

// ─── Upload DOCX (sans conversion) ───

export async function uploadDocx(
  folderId: string,
  fileName: string,
  docxBuffer: Buffer
): Promise<{ fileId: string; fileUrl: string }> {
  const drive = initDriveClient();

  const res = await drive.files.create({
    requestBody: {
      name: `${fileName}.docx`,
      parents: [folderId],
    },
    media: {
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      body: Readable.from(docxBuffer),
    },
    fields: "id, webViewLink",
    supportsAllDrives: true,
  });

  if (!res.data.id) throw new Error(`Upload échoué pour ${fileName}`);

  return {
    fileId: res.data.id,
    fileUrl: res.data.webViewLink || `https://drive.google.com/file/d/${res.data.id}/view`,
  };
}

// ─── Upload PDF buffer to Drive ───

export async function uploadPdf(
  folderId: string,
  fileName: string,
  pdfBuffer: Buffer
): Promise<string> {
  const drive = initDriveClient();

  const res = await drive.files.create({
    requestBody: {
      name: `${fileName}.pdf`,
      mimeType: "application/pdf",
      parents: [folderId],
    },
    media: {
      mimeType: "application/pdf",
      body: Readable.from(pdfBuffer),
    },
    fields: "id, webViewLink",
    supportsAllDrives: true,
  });

  return res.data.webViewLink || `https://drive.google.com/file/d/${res.data.id}/view`;
}

// ─── Download file from Drive as Buffer ───

export async function downloadFile(fileId: string): Promise<Buffer> {
  const drive = initDriveClient();

  const res = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "arraybuffer" }
  );

  return Buffer.from(res.data as ArrayBuffer);
}

// ─── Contrats définitifs (folder dédié, pas de PDF, pas de DocuSign) ───

/**
 * Nomenclature des fichiers Drive pour les Contrats Définitifs (C1-C8).
 * Reprend le format des promesses (FILE_NAMES) en remplaçant le libellé
 * "Promesse contrat de conciergerie" par "Contrat de prestations de services".
 */
const CONTRAT_FILE_NAMES: Record<string, string> = {
  "C1.P.CJ": "C1.P.CJ - Contrat de prestations de services - Zones Classiques et Jaunes - Société en cours de formation",
  "C1.P.R":  "C1.P.R - Contrat de prestations de services - Zones Rouges - Société en cours de formation",
  "C1.S.CJ": "C1.S.CJ - Contrat de prestations de services - Zones Classiques et Jaunes - Société déjà existante",
  "C1.S.R":  "C1.S.R - Contrat de prestations de services - Zones Rouges - Société déjà existante",
  "C2.P":    "C2.P - Contrat de prestations de services - Société en cours de formation - Sans ménage et sans blanchisserie",
  "C2.S":    "C2.S - Contrat de prestations de services - Société déjà existante - Sans ménage et sans blanchisserie",
  "C3.P.CJ": "C3.P.CJ - Contrat de prestations de services - Zones Classiques et Jaunes - Société en cours de formation - Studio",
  "C3.P.R":  "C3.P.R - Contrat de prestations de services - Zones Rouges - Société en cours de formation - Studio",
  "C3.S.CJ": "C3.S.CJ - Contrat de prestations de services - Zones Classiques et Jaunes - Société déjà existante - Studio",
  "C3.S.R":  "C3.S.R - Contrat de prestations de services - Zones Rouges - Société déjà existante - Studio",
  "C4.P":    "C4.P - Contrat de prestations de services - Société en cours de formation - Sans ménage et sans blanchisserie - Studio",
  "C4.S":    "C4.S - Contrat de prestations de services - Société déjà existante - Sans ménage et sans blanchisserie - Studio",
  "C5.P.CJ": "C5.P.CJ - Contrat de prestations de services - Zones Classiques et Jaunes - Société en cours de formation - 20%",
  "C5.P.R":  "C5.P.R - Contrat de prestations de services - Zones Rouges - Société en cours de formation - 20%",
  "C5.S.CJ": "C5.S.CJ - Contrat de prestations de services - Zones Classiques et Jaunes - Société déjà existante - 20%",
  "C5.S.R":  "C5.S.R - Contrat de prestations de services - Zones Rouges - Société déjà existante - 20%",
  "C6.P":    "C6.P - Contrat de prestations de services - Société en cours de formation - Sans ménage et sans blanchisserie - 20%",
  "C6.S":    "C6.S - Contrat de prestations de services - Société déjà existante - Sans ménage et sans blanchisserie - 20%",
  "C7.P.CJ": "C7.P.CJ - Contrat de prestations de services - Zones Classiques et Jaunes - Société en cours de formation - Courte durée",
  "C7.P.R":  "C7.P.R - Contrat de prestations de services - Zones Rouges - Société en cours de formation - Courte durée",
  "C7.S.CJ": "C7.S.CJ - Contrat de prestations de services - Zones Classiques et Jaunes - Société déjà existante - Courte durée",
  "C7.S.R":  "C7.S.R - Contrat de prestations de services - Zones Rouges - Société déjà existante - Courte durée",
  "C8.P":    "C8.P - Contrat de prestations de services - Société en cours de formation - Sans ménage et sans blanchisserie - Courte durée",
  "C8.S":    "C8.S - Contrat de prestations de services - Société déjà existante - Sans ménage et sans blanchisserie - Courte durée",
};

export function getContratFileName(code: string): string {
  return CONTRAT_FILE_NAMES[code] || code;
}

function getContratsRootId(): string {
  const id = process.env.GOOGLE_DRIVE_CONTRATS_ROOT_FOLDER_ID;
  if (!id) throw new Error("GOOGLE_DRIVE_CONTRATS_ROOT_FOLDER_ID manquant");
  return id;
}

/**
 * Archive l'éventuel dossier "(en cours)" présent dans le dossier racine
 * des Contrats Définitifs : retire " (en cours)" du nom et le déplace dans
 * le dossier Archives partagé avec les Promesses (`GOOGLE_DRIVE_ARCHIVE_FOLDER_ID`).
 */
export async function archiveCurrentContratsFolder(): Promise<string[]> {
  const drive = initDriveClient();
  const parentId = getContratsRootId();
  const archiveId = process.env.GOOGLE_DRIVE_ARCHIVE_FOLDER_ID;
  if (!archiveId) throw new Error("GOOGLE_DRIVE_ARCHIVE_FOLDER_ID manquant");

  const res = await drive.files.list({
    q: `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and name contains '(en cours)' and trashed = false`,
    fields: "files(id, name)",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const archived: string[] = [];
  for (const folder of res.data.files || []) {
    if (!folder.id || !folder.name) continue;
    const newName = folder.name.replace(" (en cours)", "");
    await drive.files.update({
      fileId: folder.id,
      addParents: archiveId,
      removeParents: parentId,
      requestBody: { name: newName },
      supportsAllDrives: true,
    });
    archived.push(newName);
  }
  return archived;
}

/**
 * Crée le dossier de sortie pour les contrats du jour :
 *   "MODELES CONTRATS - MAJ DU JJ/MM/AA (en cours)"
 * dans GOOGLE_DRIVE_CONTRATS_ROOT_FOLDER_ID.
 */
export async function createContratsOutputFolder(dateStr: string): Promise<string> {
  const drive = initDriveClient();
  const parentId = getContratsRootId();

  const folder = await drive.files.create({
    requestBody: {
      name: `MODELES CONTRATS - MAJ DU ${dateStr} (en cours)`,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
    supportsAllDrives: true,
  });
  if (!folder.data.id) throw new Error("Échec création dossier contrats Drive");
  return folder.data.id;
}

/**
 * Upload du DOCX d'un contrat dans le dossier passé. Le nom du fichier
 * suit la nomenclature CONTRAT_FILE_NAMES (code → libellé long).
 */
export async function uploadContratDocx(
  folderId: string,
  code: string,
  docxBuffer: Buffer
): Promise<{ fileId: string; fileUrl: string }> {
  return uploadDocx(folderId, getContratFileName(code), docxBuffer);
}

