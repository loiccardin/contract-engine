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
