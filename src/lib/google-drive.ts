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
  });

  const pdfFolder = await drive.files.create({
    requestBody: {
      name: `MODELES PROMESSES EN PDF - MAJ DU ${dateStr} (en cours)`,
      mimeType: "application/vnd.google-apps.folder",
      parents: [rootId],
    },
    fields: "id",
  });

  if (!docsFolder.data.id || !pdfFolder.data.id) {
    throw new Error("Échec création dossiers Drive");
  }

  return {
    docsFolderId: docsFolder.data.id,
    pdfFolderId: pdfFolder.data.id,
  };
}

// ─── Upload DOCX → Google Doc ───

export async function uploadDocxAsGoogleDoc(
  folderId: string,
  fileName: string,
  docxBuffer: Buffer
): Promise<{ googleDocId: string; googleDocUrl: string }> {
  const drive = initDriveClient();

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      mimeType: "application/vnd.google-apps.document", // Convert to Google Doc
      parents: [folderId],
    },
    media: {
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      body: Readable.from(docxBuffer),
    },
    fields: "id, webViewLink",
  });

  if (!res.data.id) throw new Error(`Upload échoué pour ${fileName}`);

  return {
    googleDocId: res.data.id,
    googleDocUrl: res.data.webViewLink || `https://docs.google.com/document/d/${res.data.id}/edit`,
  };
}

// ─── Export Google Doc → PDF ───

export async function exportAsPdf(
  googleDocId: string,
  pdfFolderId: string,
  fileName: string
): Promise<string> {
  const drive = initDriveClient();

  // Export as PDF
  const exportRes = await drive.files.export(
    { fileId: googleDocId, mimeType: "application/pdf" },
    { responseType: "arraybuffer" }
  );

  const pdfBuffer = Buffer.from(exportRes.data as ArrayBuffer);

  // Upload PDF to the PDF folder
  const uploadRes = await drive.files.create({
    requestBody: {
      name: `${fileName}.pdf`,
      mimeType: "application/pdf",
      parents: [pdfFolderId],
    },
    media: {
      mimeType: "application/pdf",
      body: Readable.from(pdfBuffer),
    },
    fields: "id, webViewLink",
  });

  return uploadRes.data.webViewLink || `https://drive.google.com/file/d/${uploadRes.data.id}/view`;
}
