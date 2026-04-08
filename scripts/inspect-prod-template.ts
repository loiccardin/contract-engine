import { config } from "dotenv";
config({ path: ".env.local" });

import * as fs from "fs";
import { getAccessToken } from "../src/lib/docusign";

const BASE_URL = process.env.DOCUSIGN_BASE_URL!;
const ACCOUNT_ID = process.env.DOCUSIGN_ACCOUNT_ID!;
const TEMPLATE_ID = "bf637b2d-90d1-462d-9384-ca20a5e9911c";

async function api(path: string) {
  const token = await getAccessToken();
  const res = await fetch(`${BASE_URL}/v2.1/accounts/${ACCOUNT_ID}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`API ${path} failed (${res.status}): ${await res.text()}`);
  return res.json();
}

async function main() {
  console.log("=== Inspection du template de production ===\n");

  // 1. Template info
  const tmpl = await api(`/templates/${TEMPLATE_ID}`);
  console.log(`Template : ${tmpl.name}`);
  console.log(`Documents : ${tmpl.documents?.length || 0}`);
  console.log(`Status : ${tmpl.status}`);

  // 2. Recipients
  const recip = await api(`/templates/${TEMPLATE_ID}/recipients`);
  console.log("\n--- Recipients ---");
  const allRecipients: Record<string, unknown>[] = [];

  for (const type of ["signers", "carbonCopies", "certifiedDeliveries", "agents", "editors", "intermediaries", "inPersonSigners"]) {
    const list = recip[type];
    if (!list || !list.length) continue;
    for (const r of list) {
      console.log(`  [${type}] ${r.roleName || r.name || "?"} — recipientId=${r.recipientId}, routingOrder=${r.routingOrder}, email=${r.email || "(role)"}`);
      allRecipients.push({ type, ...r });
    }
  }

  // 3. Tabs for each signer
  const fullOutput: Record<string, unknown> = {
    templateId: TEMPLATE_ID,
    templateName: tmpl.name,
    recipients: allRecipients,
    tabs: {},
  };

  const signers = recip.signers || [];
  for (const signer of signers) {
    console.log(`\n--- Tabs for "${signer.roleName}" (recipientId=${signer.recipientId}) ---`);

    const tabs = await api(`/templates/${TEMPLATE_ID}/recipients/${signer.recipientId}/tabs`);
    fullOutput.tabs = tabs;

    const tabTypes = Object.keys(tabs).filter(k => Array.isArray(tabs[k]) && tabs[k].length > 0);

    for (const tabType of tabTypes) {
      const items = tabs[tabType];
      console.log(`\n  ${tabType} (${items.length}):`);
      for (const tab of items) {
        const parts: string[] = [];
        if (tab.anchorString) parts.push(`anchor="${tab.anchorString}"`);
        if (tab.xPosition) parts.push(`x=${tab.xPosition}`);
        if (tab.yPosition) parts.push(`y=${tab.yPosition}`);
        if (tab.anchorXOffset) parts.push(`xOff=${tab.anchorXOffset}`);
        if (tab.anchorYOffset) parts.push(`yOff=${tab.anchorYOffset}`);
        if (tab.pageNumber) parts.push(`page=${tab.pageNumber}`);
        if (tab.width) parts.push(`w=${tab.width}`);
        if (tab.height) parts.push(`h=${tab.height}`);
        if (tab.tabLabel) parts.push(`label="${tab.tabLabel}"`);
        if (tab.name) parts.push(`name="${tab.name}"`);
        if (tab.value) parts.push(`value="${tab.value}"`);
        if (tab.tooltip) parts.push(`tooltip="${tab.tooltip}"`);
        if (tab.required) parts.push(`req=${tab.required}`);
        if (tab.locked) parts.push(`locked=${tab.locked}`);
        console.log(`    ${parts.join(", ")}`);
      }
    }
  }

  // 4. Save full JSON
  const outPath = "scripts/reference-tabs-config.json";
  fs.writeFileSync(outPath, JSON.stringify(fullOutput, null, 2));
  console.log(`\n✓ JSON complet sauvegardé dans ${outPath}`);
}

main().catch((e) => {
  console.error("✗ Erreur:", e.message);
  process.exit(1);
});
