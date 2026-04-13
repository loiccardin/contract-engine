import jwt from "jsonwebtoken";

// ─── Config ───

function getConfig() {
  const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY;
  const userId = process.env.DOCUSIGN_USER_ID;
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
  const baseUrl = process.env.DOCUSIGN_BASE_URL;
  const rsaKey = process.env.DOCUSIGN_RSA_PRIVATE_KEY;

  if (!integrationKey || !userId || !accountId || !baseUrl || !rsaKey) {
    throw new Error("Variables DOCUSIGN_* manquantes dans .env.local");
  }

  // RSA key stored as single line with \n → restore actual newlines
  const privateKey = rsaKey.replace(/\\n/g, "\n");

  return { integrationKey, userId, accountId, baseUrl, privateKey };
}

// ─── Token cache ───

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

// ─── JWT Grant Auth ───

export async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 5min margin)
  if (cachedToken && Date.now() < tokenExpiresAt - 300000) {
    return cachedToken;
  }

  const { integrationKey, userId, privateKey } = getConfig();

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: integrationKey,
    sub: userId,
    aud: "account.docusign.com",
    iat: now,
    exp: now + 3600, // 1 hour
    scope: "signature impersonation",
  };

  const assertion = jwt.sign(payload, privateKey, { algorithm: "RS256" });

  const res = await fetch("https://account.docusign.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`DocuSign auth échouée (${res.status}): ${error}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;

  return cachedToken!;
}

// ─── List templates ───

export async function listTemplates(): Promise<{ templateId: string; name: string }[]> {
  const { baseUrl, accountId } = getConfig();
  const token = await getAccessToken();

  const res = await fetch(
    `${baseUrl}/v2.1/accounts/${accountId}/templates`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`DocuSign listTemplates échoué (${res.status}): ${error}`);
  }

  const data = await res.json();
  const templates = data.envelopeTemplates || [];

  return templates.map((t: { templateId: string; name: string }) => ({
    templateId: t.templateId,
    name: t.name,
  }));
}

// ─── Create template with document + anchor tabs ───

export async function createTemplateWithDocument(
  contractCode: string,
  pdfOrDocxBuffer: Buffer,
  fileName: string,
  fileType: "pdf" | "docx" = "pdf"
): Promise<string> {
  const { baseUrl, accountId } = getConfig();
  const token = await getAccessToken();

  const documentBase64 = pdfOrDocxBuffer.toString("base64");

  // Text tabs — v4: tooltip (placeholder grisé), pas value (pré-rempli)
  const textTabs: Record<string, unknown>[] = [
    { anchorString: "/nm1/", anchorXOffset: "0", anchorYOffset: "0", anchorUnits: "pixels", tabLabel: "nom_complet", tooltip: "Nom et Prénoms", value: "", required: "true", width: 300, height: 15 },
    { anchorString: "envisagé à :", anchorXOffset: "5", anchorYOffset: "-2", anchorUnits: "pixels", tabLabel: "siege_social", tooltip: "Adresse postale complète du siège social", value: "", required: "true", width: 300, height: 15 },
    { anchorString: "/dn1/", anchorXOffset: "0", anchorYOffset: "0", anchorUnits: "pixels", tabLabel: "date_naissance", tooltip: "JJ/MM/AAAA", value: "", required: "true", width: 150, height: 15 },
    { anchorString: "/ad1/", anchorXOffset: "0", anchorYOffset: "0", anchorUnits: "pixels", tabLabel: "adresse", tooltip: "Adresse postale complète", value: "", required: "true", width: 350, height: 15 },
    { anchorString: "Pays :", anchorXOffset: "30", anchorYOffset: "-2", anchorUnits: "pixels", tabLabel: "pays", tooltip: "France / autre", value: "", required: "true", width: 200, height: 15 },
    { anchorString: "/tl1/", anchorXOffset: "0", anchorYOffset: "0", anchorUnits: "pixels", tabLabel: "telephone", tooltip: "Numéro de téléphone", value: "", required: "true", width: 200, height: 15 },
    { anchorString: "/ml1/", anchorXOffset: "0", anchorYOffset: "0", anchorUnits: "pixels", tabLabel: "email", tooltip: "Adresse email", value: "", required: "true", width: 250, height: 15 },
    { anchorString: "/lg1/", anchorXOffset: "0", anchorYOffset: "15", anchorUnits: "pixels", tabLabel: "adresse_logement", tooltip: "Adresse du ou des biens exploités en LCD", value: "", required: "true", width: 450, height: 60 },
    { anchorString: "/vi1/", anchorXOffset: "0", anchorYOffset: "0", anchorUnits: "pixels", tabLabel: "ville", tooltip: "Ville", value: "", required: "true", width: 150, height: 15 },
    { anchorString: "/cm1/", anchorXOffset: "0", anchorYOffset: "0", anchorUnits: "pixels", tabLabel: "commentaires", tooltip: "Commentaires éventuels", value: "", required: "false", width: 330, height: 55 },
  ];

  // Add SIREN tab for société variants (.S)
  if (contractCode.includes(".S")) {
    textTabs.push({
      anchorString: "/sr1/", anchorXOffset: "0", anchorYOffset: "0", anchorUnits: "pixels",
      tabLabel: "siren", tooltip: "Numéro SIREN", value: "", required: "true", width: 150, height: 15,
    });
  }

  const body = {
    name: `CE - ${contractCode}`,
    description: `Contract Engine — ${contractCode}`,
    emailSubject: "Contrat de conciergerie — Signature requise",
    documents: [{ documentBase64, name: fileName, fileExtension: fileType, documentId: "1" }],
    recipients: {
      signers: [{
        roleName: "PROPRIETAIRE",
        recipientId: "1",
        routingOrder: "1",
        requireIdLookup: "false",
        tabs: {
          signHereTabs: [{ anchorString: "/sn1/", anchorXOffset: "0", anchorYOffset: "20", anchorUnits: "pixels" }],
          dateSignedTabs: [{ anchorString: "/dt1/", anchorXOffset: "0", anchorYOffset: "0", anchorUnits: "pixels" }],
          textTabs,
          initialHereTabs: [{ anchorString: "/ini1/", anchorXOffset: "0", anchorYOffset: "0", anchorUnits: "pixels" }],
        },
      }],
      // Pas de carbonCopies — LETAHOST recevra sa copie via les paramètres du compte
    },
    status: "created",
  };

  const res = await fetch(`${baseUrl}/v2.1/accounts/${accountId}/templates`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`DocuSign createTemplate échoué (${res.status}): ${error}`);
  }

  const data = await res.json();
  return data.templateId;
}

// ─── Update template document ───

export async function updateTemplateDocument(
  templateId: string,
  pdfOrDocxBuffer: Buffer,
  fileName: string,
  fileType: "pdf" | "docx" = "pdf"
): Promise<void> {
  const { baseUrl, accountId } = getConfig();
  const token = await getAccessToken();

  const mimeType = fileType === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  const res = await fetch(`${baseUrl}/v2.1/accounts/${accountId}/templates/${templateId}/documents/1`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": mimeType,
      "Content-Disposition": `file; filename="${fileName}"; documentid=1; fileExtension=${fileType}`,
    },
    body: new Uint8Array(pdfOrDocxBuffer),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`DocuSign updateTemplateDocument échoué (${res.status}): ${error}`);
  }
}

// ─── Create PowerForm ───

export async function createPowerForm(
  templateId: string,
  contractCode: string
): Promise<{ powerFormId: string; powerFormUrl: string }> {
  const { baseUrl, accountId } = getConfig();
  const token = await getAccessToken();

  const res = await fetch(`${baseUrl}/v2.1/accounts/${accountId}/powerforms`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `CE - ${contractCode}`,
      templateId,
      signingMode: "direct",
      signerRoles: [{ roleName: "PROPRIETAIRE", name: "", email: "" }],
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`DocuSign createPowerForm échoué (${res.status}): ${error}`);
  }

  const data = await res.json();
  return {
    powerFormId: data.powerFormId,
    powerFormUrl: data.powerFormUrl || `https://eu.docusign.net/Member/PowerFormSigning.aspx?PowerFormId=${data.powerFormId}`,
  };
}

// ─── Build template body (shared between push route + batch scripts) ───

export interface TemplateBodyOptions {
  code: string;
  pdfBase64: string;
  pageCount: number;
  dureeType?: "standard" | "courte";
  statutType?: "particulier" | "societe";
}

export function buildTemplateBody(opts: TemplateBodyOptions) {
  const { code, pdfBase64, pageCount } = opts;
  const common = {
    locked: "false", disableAutoSize: "false", concealValueOnDocument: "false",
    maxLength: "4000", shared: "false", requireInitialOnSharedChange: "false", requireAll: "false",
  };
  const s9 = { font: "lucidaconsole", fontSize: "size9", fontColor: "black", bold: "false", italic: "false", underline: "false" };
  const s8 = { font: "lucidaconsole", fontSize: "size8", fontColor: "black", bold: "false", italic: "false", underline: "false" };
  const a0 = { anchorXOffset: "0", anchorYOffset: "0", anchorUnits: "pixels" };

  const textTabs: Record<string, unknown>[] = [
    { anchorString: "/nm1/", ...a0, ...s9, ...common, tabLabel: "nom_prenoms", value: "Nom et Prénoms", required: "true", width: 365, height: 16 },
    { anchorString: "/ss1/", ...a0, ...s9, ...common, tabLabel: "siege_social", value: "Adresse postale complète du siège social", required: "true", width: 391, height: 16 },
    { anchorString: "/dn1/", ...a0, ...s9, ...common, tabLabel: "date_naissance", value: "JJ/MM/AAAA", required: "true", width: 241, height: 16 },
    { anchorString: "/ad1/", ...a0, ...s9, ...common, tabLabel: "adresse_domicile", value: "Adresse postale complète personnelle", required: "true", width: 391, height: 16 },
    { anchorString: "/py1/", ...a0, ...s9, ...common, tabLabel: "pays", value: "France / autre", required: "true", width: 241, height: 17 },
    { anchorString: "/tl1/", ...a0, ...s9, ...common, tabLabel: "telephone", value: "Numéro de téléphone", required: "true", width: 206, height: 17 },
    { anchorString: "/ml1/", ...a0, ...s9, ...common, tabLabel: "mail", value: "adresse mail", required: "true", width: 347, height: 18 },
    { anchorString: "/lg1/", ...a0, ...s9, ...common, tabLabel: "adresse_logement", value: "Adresse du ou des biens exploités en LCD", required: "true", width: 563, height: 35 },
    { anchorString: "/lg2/", anchorXOffset: "0", anchorYOffset: "5", anchorUnits: "pixels", ...s9, ...common, tabLabel: "adresse_logement_2", value: "Adresse du ou des biens exploités en LCD", required: "true", width: 520, height: 35 },
    { anchorString: "/cm1/", anchorXOffset: "10", anchorYOffset: "10", anchorUnits: "pixels", ...s9, ...common, tabLabel: "commentaires", value: "", required: "false", width: 480, height: 80 },
    { anchorString: "fait à", anchorXOffset: "30", anchorYOffset: "0", anchorUnits: "pixels", ...s8, ...common, tabLabel: "ville", value: "Ville", required: "true", width: 122, height: 15 },
    { anchorString: "/sn1/", anchorXOffset: "0", anchorYOffset: "0", anchorUnits: "pixels", ...s8, ...common, tabLabel: "bon_pour_accord", value: "Bon pour accord", required: "true", width: 161, height: 16 },
    { anchorString: "originaux le", anchorXOffset: "70", anchorYOffset: "0", anchorUnits: "pixels", ...s8, ...common, tabLabel: "date_signature", value: "Date", required: "true", width: 150, height: 15 },
  ];

  if (code.includes(".S")) {
    textTabs.push({
      anchorString: "/sr1/", ...a0, ...s9, ...common,
      tabLabel: "siren", value: "Numéro SIREN", required: "true", width: 150, height: 15,
    });
  }

  // Tabs courte durée — uniquement pour P7/P8 (art_2_3 avec rectangle + jours)
  if (opts.dureeType === "courte") {
    textTabs.push(
      {
        anchorString: "/pl1/", anchorXOffset: "0", anchorYOffset: "5", anchorUnits: "pixels",
        ...s9, ...common,
        tabLabel: "plages_location",
        value: "A compléter par les plages durant lesquelles le LOGEMENT sera disponible à la location",
        required: "true", width: 520, height: 35,
      },
      {
        anchorString: "/jr1/", ...a0, ...s9, ...common,
        tabLabel: "nombre_jours", value: "", required: "true", width: 80, height: 16,
      }
    );
  }

  const initialHereTabs = Array.from({ length: pageCount }, (_, i) => ({
    name: "InitialHere", tabLabel: `paraphe_page_${i + 1}`, scaleValue: "1",
    optional: "false", documentId: "1", pageNumber: String(i + 1),
    xPosition: "72", yPosition: "775",
  }));

  return {
    name: `CE - ${code}`,
    description: `Contract Engine — ${code}`,
    emailSubject: "Promesse de contrat de conciergerie — Signature requise",
    recipientsLock: "true",
    messageLock: "true",
    documents: [{ documentBase64: pdfBase64, name: `${code}.pdf`, fileExtension: "pdf", documentId: "1" }],
    recipients: {
      signers: [{
        roleName: "PROPRIETAIRE", recipientId: "1", routingOrder: "1", requireIdLookup: "false",
        tabs: {
          textTabs,
          signHereTabs: [{ anchorString: "/sn1/", anchorXOffset: "0", anchorYOffset: "65", anchorUnits: "pixels", scaleValue: "1.25", tabLabel: "signature_proprietaire" }],
          initialHereTabs,
        },
      }],
      carbonCopies: [{
        roleName: "LETAHOST LLC", recipientId: "2", routingOrder: "2",
        name: "Loïc CARDIN", email: "direction@conciergerie-letahost.com",
        templateLocked: "true", templateRequired: "true",
      }],
    },
    status: "created",
  };
}

// ─── Update envelope-level template metadata (locks + emailSubject) ───

export async function updateTemplateMetadata(templateId: string): Promise<void> {
  const { baseUrl, accountId } = getConfig();
  const token = await getAccessToken();

  const res = await fetch(`${baseUrl}/v2.1/accounts/${accountId}/templates/${templateId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      emailSubject: "Promesse de contrat de conciergerie — Signature requise",
      recipientsLock: "true",
      messageLock: "true",
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    console.error(`Update metadata ${templateId} échoué (${res.status}): ${error}`);
  }
}

// ─── Reactivate PowerForm after template update ───

export async function reactivatePowerForm(powerFormId: string): Promise<void> {
  const { baseUrl, accountId } = getConfig();
  const token = await getAccessToken();

  const res = await fetch(`${baseUrl}/v2.1/accounts/${accountId}/powerforms/${powerFormId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ status: "active" }),
  });

  if (!res.ok) {
    const error = await res.text();
    console.error(`Réactivation PowerForm ${powerFormId} échouée (${res.status}): ${error}`);
  }
}
