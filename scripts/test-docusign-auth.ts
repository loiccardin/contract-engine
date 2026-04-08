import { config } from "dotenv";
config({ path: ".env.local" });

import { getAccessToken, listTemplates } from "../src/lib/docusign";

async function main() {
  console.log("Test DocuSign JWT Auth...\n");

  // 1. Get access token
  const token = await getAccessToken();
  console.log("Auth OK — Access token:", token.substring(0, 40) + "...");

  // 2. List templates
  const templates = await listTemplates();
  console.log(`\nTemplates trouvés : ${templates.length}`);
  for (const t of templates.slice(0, 10)) {
    console.log(`  - ${t.name} (${t.templateId})`);
  }
  if (templates.length > 10) {
    console.log(`  ... et ${templates.length - 10} autres`);
  }

  console.log("\n✓ DocuSign auth fonctionne !");
}

main().catch((e) => {
  console.error("✗ Erreur:", e.message);
  process.exit(1);
});
