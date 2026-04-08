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

  // Text tabs — sized and positioned per v2 spec
  const textTabs: Record<string, unknown>[] = [
    { anchorString: "/nm1/", anchorXOffset: "0", anchorYOffset: "0", anchorUnits: "pixels", tabLabel: "nom_complet", required: "true", width: 300, height: 15 },
    { anchorString: "est envisagé à :", anchorXOffset: "5", anchorYOffset: "-2", anchorUnits: "pixels", tabLabel: "siege_social", required: "true", width: 350, height: 15 },
    { anchorString: "/dn1/", anchorXOffset: "0", anchorYOffset: "0", anchorUnits: "pixels", tabLabel: "date_naissance", required: "true", width: 150, height: 15 },
    { anchorString: "/ad1/", anchorXOffset: "0", anchorYOffset: "0", anchorUnits: "pixels", tabLabel: "adresse", required: "true", width: 350, height: 15 },
    { anchorString: "Pays :", anchorXOffset: "30", anchorYOffset: "-2", anchorUnits: "pixels", tabLabel: "pays", required: "true", width: 200, height: 15 },
    { anchorString: "/tl1/", anchorXOffset: "0", anchorYOffset: "0", anchorUnits: "pixels", tabLabel: "telephone", required: "true", width: 200, height: 15 },
    { anchorString: "/ml1/", anchorXOffset: "0", anchorYOffset: "0", anchorUnits: "pixels", tabLabel: "email", required: "true", width: 250, height: 15 },
    { anchorString: "/lg1/", anchorXOffset: "0", anchorYOffset: "20", anchorUnits: "pixels", tabLabel: "adresse_logement", required: "true", width: 450, height: 80 },
    { anchorString: "/vi1/", anchorXOffset: "0", anchorYOffset: "0", anchorUnits: "pixels", tabLabel: "ville", required: "true", width: 150, height: 15 },
    { anchorString: "/cm1/", anchorXOffset: "10", anchorYOffset: "5", anchorUnits: "pixels", tabLabel: "commentaires", required: "false", width: 350, height: 60 },
  ];

  // Add SIREN tab for société variants (.S)
  if (contractCode.includes(".S")) {
    textTabs.push({
      anchorString: "/sr1/", anchorXOffset: "0", anchorYOffset: "0", anchorUnits: "pixels",
      tabLabel: "siren", required: "true", width: 150, height: 15,
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
          signHereTabs: [{ anchorString: "/sn1/", anchorXOffset: "0", anchorYOffset: "30", anchorUnits: "pixels" }],
          dateSignedTabs: [{ anchorString: "/dt1/", anchorXOffset: "0", anchorYOffset: "0", anchorUnits: "pixels" }],
          textTabs,
          initialHereTabs: [{ anchorString: "/ini1/", anchorXOffset: "100", anchorYOffset: "0", anchorUnits: "pixels" }],
        },
      }],
      carbonCopies: [{
        roleName: "LETAHOST",
        recipientId: "2",
        routingOrder: "2",
        email: "direction@conciergerie-letahost.com",
        name: "LETAHOST LLC",
      }],
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
