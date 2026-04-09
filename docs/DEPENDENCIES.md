# Carte des dependances -- Contract Engine

> **OBLIGATOIRE** : consulter ce fichier AVANT de modifier tout fichier source.
> Si tu modifies un fichier liste ici, tu DOIS verifier tous les fichiers qui en dependent.
> Si tu ajoutes un import ou supprimes un export, tu DOIS mettre a jour ce fichier.

## Comment lire ce fichier

Chaque entree suit ce format :
- **Fichier** : le fichier source
- **Exporte** : ce qu'il expose (fonctions, composants, types, constantes)
- **Utilise par** : les fichiers qui importent depuis celui-ci
- **Depend de** : les fichiers depuis lesquels il importe

> Attention : Si un fichier a beaucoup de "Utilise par", c'est un fichier critique.
> Le modifier peut casser beaucoup de choses. Proceder avec prudence.

---

## Fichiers critiques (modifier avec extreme prudence)

### `src/lib/db.ts`
- **Exporte :** `prisma` (client Prisma)
- **Utilise par :** toutes les routes API (`articles`, `articles/[id]`, `contracts`, `generate`, `generate-test`, `generate-test-all`, `push-docusign`, `versions`)
- **Depend de :** `pg` (Pool), `@prisma/adapter-pg` (PrismaPg), `@/generated/prisma/client` (PrismaClient)
- **Impact :** Fichier fondation. Ne JAMAIS modifier sans validation Loic.

### `src/lib/contract-assembler.ts`
- **Exporte :** `assembleContract(articles: Article[], contract: Contract): AssembledArticle[]`
- **Utilise par :** `src/app/api/generate/route.ts`, `src/app/api/generate-test/route.ts`, `src/app/api/generate-test-all/route.ts`, `scripts/create-template-anchor.ts`, `scripts/test-docusign-create-template.ts`, `scripts/test-pdf-conversion.ts`
- **Depend de :** `src/types/index.ts` (Article, Contract, AssembledArticle)
- **Fonctions internes :** `selectContent()` (selection contenu par scope), `computeSectionNumbers()` (numerotation dynamique 2.2.x/2.4.x)
- **Impact :** Logique metier critique -- selection du contenu par scope + numerotation dynamique. Si un article est mal assemble, le contrat signe sera faux.

### `src/lib/docx-generator.ts`
- **Exporte :** `generateDocx(assembledArticles: AssembledArticle[], contract: Contract): Promise<Buffer>`
- **Utilise par :** `src/app/api/generate/route.ts`, `src/app/api/generate-test/route.ts`, `src/app/api/generate-test-all/route.ts`, `scripts/create-template-anchor.ts`, `scripts/test-docusign-create-template.ts`, `scripts/test-pdf-conversion.ts`
- **Depend de :** `src/config/styles.ts` (FONTS, FONT_SIZES, PAGE, SPACING, SIGNATURE), `src/types/index.ts`, `docx` (npm), `jszip` (npm), `fs`, `path`, `src/templates/*` (header/footer XML, images), `public/images/tampon-letahost.png`
- **Fonctions internes :** `anchorTab()` (texte blanc invisible 1pt), `parseContent()` (parsing lignes en paragraphes DOCX), `buildCommentBox()` (art 9 encadre), `buildSignatureBlock()` (bloc signature avec /sn1/ /dt1/ /vi1/), `buildAnnexeTable()` (annexe 2 tableau), `applyDynamicNumbering()` (renumerotation 2.2.x/2.4.x), `injectTemplateHeaderFooter()` (post-processing ZIP pour header/footer custom)
- **Impact :** Mise en page des contrats. Toute modification doit etre verifiee visuellement sur P1.P.CJ, P3.S.R et P6.P.

### `src/config/contracts.ts`
- **Exporte :** `ContractVariant` (type), `CONTRACT_VARIANTS` (tableau des 18 variantes)
- **Utilise par :** `prisma/seed.ts`
- **Depend de :** rien
- **Impact :** Source de verite pour le mapping des 18 variantes. Erreur ici = mauvais contrat envoye a DocuSign.

---

## Lib

### `src/middleware.ts`
- **Exporte :** `middleware(request: NextRequest)`, `config` (matcher)
- **Utilise par :** Next.js (execute automatiquement sur chaque requete matchant le matcher)
- **Depend de :** `next/server` (NextRequest, NextResponse), `process.env.APP_SECRET`, `process.env.LOGIN_PASSWORD`
- **Detail :** Edge Runtime -- utilise **Web Crypto API** (`crypto.subtle.importKey` + `crypto.subtle.sign`) pour calculer HMAC-SHA256. Ne peut PAS utiliser le module Node.js `crypto`. Redirige vers `/login` si le cookie session est invalide. Routes publiques : `/login`, `/api/auth/*`, `/_next/*`, `/favicon.ico`. Les routes `/api/*` ne sont pas verifiees par le middleware (chaque route API appelle `authenticate()` elle-meme).
- **Fonction interne :** `hmacSha256(key, message)` -- calcul HMAC-SHA256 via Web Crypto API

### `src/lib/auth.ts`
- **Exporte :** `authenticate(request: NextRequest): NextResponse | null` -- retourne null si OK, NextResponse 401 si echec
- **Utilise par :** toutes les routes API (`articles`, `articles/[id]`, `contracts`, `generate`, `generate-test`, `generate-test-all`, `push-docusign`, `push-docusign/single`)
- **Depend de :** `next/server` (NextRequest, NextResponse), `crypto` (createHmac), `process.env.APP_SECRET`, `process.env.LOGIN_PASSWORD`
- **Detail :** Accepte deux methodes d'auth : (1) header `Authorization: Bearer {APP_SECRET}`, (2) cookie `session` = HMAC-SHA256(APP_SECRET, LOGIN_PASSWORD). Utilise le module Node.js `crypto` (pas Web Crypto).

### `src/lib/google-drive.ts`
- **Exporte :** `getFileName(code: string): string`, `archiveCurrentFolders(): Promise<string[]>`, `createOutputFolders(dateStr: string): Promise<{ docsFolderId, pdfFolderId }>`, `uploadDocx(folderId, fileName, docxBuffer): Promise<{ fileId, fileUrl }>`, `uploadPdf(folderId, fileName, pdfBuffer): Promise<string>`, `downloadFile(fileId: string): Promise<Buffer>`
- **Utilise par :** `src/app/api/generate/route.ts` (archiveCurrentFolders, createOutputFolders, uploadDocx, getFileName), `src/app/api/push-docusign/route.ts` (downloadFile, uploadPdf), `src/app/api/push-docusign/single/route.ts` (downloadFile)
- **Depend de :** `googleapis` (npm), `stream` (Readable)
- **Constante interne :** `FILE_NAMES` -- mapping code -> nom complet du fichier Drive (18 entrees)

### `src/lib/docusign.ts`
- **Exporte :** `getAccessToken(): Promise<string>`, `listTemplates(): Promise<{ templateId, name }[]>`, `createTemplateWithDocument(contractCode, buffer, fileName, fileType): Promise<string>`, `updateTemplateDocument(templateId, buffer, fileName, fileType): Promise<void>`, `createPowerForm(templateId, contractCode): Promise<{ powerFormId, powerFormUrl }>`, `reactivatePowerForm(powerFormId): Promise<void>`
- **Utilise par :** `src/app/api/push-docusign/route.ts` (getAccessToken, reactivatePowerForm), `src/app/api/push-docusign/single/route.ts` (getAccessToken, reactivatePowerForm), `scripts/test-docusign-auth.ts` (getAccessToken, listTemplates), `scripts/test-docusign-create-template.ts` (createTemplateWithDocument, createPowerForm), `scripts/create-template-anchor.ts` (getAccessToken), `scripts/inspect-prod-template.ts` (getAccessToken)
- **Depend de :** `jsonwebtoken` (npm), `process.env.DOCUSIGN_*`
- **Detail :** Token cache en memoire avec renouvellement automatique (marge 5min). JWT Grant OAuth 2.0 vers instance EU.

### `src/lib/pdf-converter.ts`
- **Exporte :** `convertDocxToPdf(docxBuffer: Buffer): Promise<Buffer>`
- **Utilise par :** `src/app/api/push-docusign/route.ts`, `src/app/api/push-docusign/single/route.ts`, `scripts/test-docusign-create-template.ts`, `scripts/test-pdf-conversion.ts`, `scripts/create-template-anchor.ts`
- **Depend de :** `child_process` (execSync), `fs`, `path`, `crypto` (randomUUID)
- **Detail :** LibreOffice headless, timeout 30s, fichiers temporaires dans /tmp, detection auto du binaire (macOS vs Linux).

---

## Config

### `src/config/styles.ts`
- **Exporte :** `FONTS` (body/title: "Helvetica Neue"), `FONT_SIZES` (docTitle: 40, articleTitle/body: 20, anchorTab: 2), `PAGE` (A4, marges top 4.75cm, left/right/bottom 2.54cm), `SPACING` (lineBody: 240, lineFieldsOwner: 360, afterParagraph: 200, afterBullet: 60), `SIGNATURE` (tamponWidthPx: 180, tamponHeightPx: 140)
- **Utilise par :** `src/lib/docx-generator.ts`
- **Depend de :** `docx` (convertMillimetersToTwip, convertInchesToTwip)

---

## Composants

### `src/components/ArticleEditor.tsx`
- **Exporte :** `ArticleEditor` (composant accordeon : titre cliquable, textarea, bouton Enregistrer, feedback sauvegarde)
- **Utilise par :** `src/app/editor/page.tsx`
- **Depend de :** `react` (useState, useRef), `src/types/index.ts` (Article), `src/components/VariantTabs.tsx`

### `src/components/VariantTabs.tsx`
- **Exporte :** `VariantTabs` (onglets dynamiques selon scope : common=textarea seul, commission=3 onglets Classique/Studio/20%, statut=2 onglets Particulier/Societe, menage=3 onglets Zones CJ/Zones Rouges/Sans menage)
- **Utilise par :** `src/components/ArticleEditor.tsx`
- **Depend de :** `react` (useState), `src/types/index.ts` (Article)

### `src/components/ContractList.tsx`
- **Exporte :** rien (fichier stub -- commentaire seulement)
- **Utilise par :** non utilise actuellement
- **Depend de :** rien
- **Note :** Placeholder non implemente. La liste des contrats est affichee inline dans `generate/page.tsx` et `push/page.tsx`.

### `src/components/PreviewPanel.tsx`
- **Exporte :** rien (fichier stub -- commentaire seulement)
- **Utilise par :** non utilise actuellement
- **Depend de :** rien
- **Note :** Placeholder non implemente. L'apercu est gere via les liens Google Drive dans `generate/page.tsx`.

### `src/components/StepIndicator.tsx`
- **Exporte :** `StepIndicator` (barre 3 etapes : Modifier/Generer/Pousser, prop `currentStep`)
- **Utilise par :** `src/app/editor/page.tsx`, `src/app/generate/page.tsx`, `src/app/push/page.tsx`
- **Depend de :** rien

### `src/components/AuthProvider.tsx`
- **Exporte :** `AuthProvider` (composant, default export), `useAuth()` (hook React context)
- **Utilise par :** `src/app/layout.tsx` (wrape toute l'app), consomme via `useAuth()` dans `src/app/fix/page.tsx` et potentiellement toute page utilisant `apiCall()`
- **Depend de :** `react` (createContext, useContext, useState, useCallback, useRef), `src/components/ReLoginModal.tsx`
- **Detail :** Fournit `apiCall(url, init)` qui wrappe `fetch()` et intercepte les 401 pour afficher le ReLoginModal au lieu de perdre le travail en cours. La requete echouee est stockee dans un `useRef` et rejouee apres reconnexion.

### `src/components/ReLoginModal.tsx`
- **Exporte :** `ReLoginModal` (composant, default export, prop `onSuccess`)
- **Utilise par :** `src/components/AuthProvider.tsx`
- **Depend de :** `react` (useState)
- **Detail :** Overlay modal plein ecran (backdrop blur), formulaire mot de passe, appelle `POST /api/auth/login`. Message "Session expiree" + "Votre travail est preserve".

### `src/components/LogoutButton.tsx`
- **Exporte :** `LogoutButton` (composant, default export)
- **Utilise par :** `src/app/fix/page.tsx` (et potentiellement d'autres pages avec header)
- **Depend de :** `react`, `next/navigation` (useRouter)
- **Detail :** Bouton icone (SVG), appelle `POST /api/auth/logout` puis redirige vers `/login`.

---

## Types

### `src/types/index.ts`
- **Exporte :** `Article`, `Contract`, `AssembledArticle`, `ApiResponse<T>`
- **Utilise par :** `src/components/ArticleEditor.tsx`, `src/components/VariantTabs.tsx`, `src/app/editor/page.tsx`, `src/lib/contract-assembler.ts`, `src/lib/docx-generator.ts`, `src/app/api/generate/route.ts`, `src/app/api/generate-test/route.ts`, `src/app/api/generate-test-all/route.ts`, `scripts/test-docusign-create-template.ts`, `scripts/test-pdf-conversion.ts`, `scripts/create-template-anchor.ts`
- **Depend de :** rien

---

## Routes API

### `src/app/api/articles/route.ts`
- **Exporte :** `GET` (liste articles tries par order_index)
- **Utilise par :** `src/app/editor/page.tsx` via fetch
- **Depend de :** `src/lib/db.ts`, `src/lib/auth.ts`

### `src/app/api/articles/[id]/route.ts`
- **Exporte :** `GET` (un article par ID), `PUT` (mise a jour partielle -- champs UPDATABLE_FIELDS)
- **Utilise par :** `src/components/ArticleEditor.tsx` via fetch
- **Depend de :** `src/lib/db.ts`, `src/lib/auth.ts`

### `src/app/api/generate/route.ts`
- **Exporte :** `POST` (genere 18 DOCX + upload Drive)
- **Utilise par :** `src/app/generate/page.tsx` via fetch
- **Depend de :** `src/lib/db.ts`, `src/lib/auth.ts`, `src/lib/contract-assembler.ts`, `src/lib/docx-generator.ts`, `src/lib/google-drive.ts` (archiveCurrentFolders, createOutputFolders, uploadDocx, getFileName), `src/types/index.ts`

### `src/app/api/push-docusign/route.ts`
- **Exporte :** `POST` (telecharge DOCX Drive -> PDF LibreOffice -> push DocuSign + upload PDF Drive)
- **Utilise par :** `src/app/generate/page.tsx` via fetch
- **Depend de :** `src/lib/db.ts`, `src/lib/auth.ts`, `src/lib/pdf-converter.ts` (convertDocxToPdf), `src/lib/google-drive.ts` (downloadFile, uploadPdf), `src/lib/docusign.ts` (getAccessToken, reactivatePowerForm), `googleapis` (npm, pour trouver le dossier PDF)
- **Detail :** Cree ou met a jour les templates DocuSign. Cree les PowerForms si premiere fois. Reactive les PowerForms apres mise a jour. Insere une version dans la table versions.

### `src/app/api/contracts/route.ts`
- **Exporte :** `GET` (liste les 18 contrats avec mapping DocuSign)
- **Utilise par :** `src/app/push/page.tsx` via fetch
- **Depend de :** `src/lib/db.ts`, `src/lib/auth.ts`

### `src/app/api/versions/route.ts`
- **Exporte :** `GET` (stub -- retourne tableau vide)
- **Utilise par :** `src/app/history/page.tsx` (pas encore connecte)
- **Depend de :** `next/server` (NextResponse)
- **Note :** Stub non implemente. Retourne `{ success: true, data: [] }`.

### `src/app/api/generate-test/route.ts`
- **Exporte :** `POST` (genere un seul DOCX et le retourne en telechargement)
- **Utilise par :** tests manuels (temporaire)
- **Depend de :** `src/lib/db.ts`, `src/lib/auth.ts`, `src/lib/contract-assembler.ts`, `src/lib/docx-generator.ts`, `src/types/index.ts`
- **Body :** `{ "code": "P1.P.CJ" }`

### `src/app/api/generate-test-all/route.ts`
- **Exporte :** `POST` (genere les 18 DOCX et les retourne en ZIP)
- **Utilise par :** tests manuels (temporaire)
- **Depend de :** `src/lib/db.ts`, `src/lib/auth.ts`, `src/lib/contract-assembler.ts`, `src/lib/docx-generator.ts`, `src/types/index.ts`, `jszip` (npm)

### `src/app/api/auth/login/route.ts`
- **Exporte :** `POST` (connexion par mot de passe -> pose cookie session)
- **Utilise par :** `src/app/login/page.tsx` via fetch, `src/components/ReLoginModal.tsx` via fetch
- **Depend de :** `next/server` (NextRequest, NextResponse), `crypto` (createHmac), `process.env.LOGIN_PASSWORD`, `process.env.APP_SECRET`

### `src/app/api/auth/logout/route.ts`
- **Exporte :** `POST` (supprime cookie session)
- **Utilise par :** `src/components/LogoutButton.tsx` via fetch
- **Depend de :** `next/server` (NextResponse)

### `src/app/api/auth/check/route.ts`
- **Exporte :** `GET` (verifie validite cookie session)
- **Utilise par :** potentiellement le frontend pour verifier la session
- **Depend de :** `next/server` (NextRequest, NextResponse), `crypto` (createHmac), `process.env.LOGIN_PASSWORD`, `process.env.APP_SECRET`

### `src/app/api/push-docusign/single/route.ts`
- **Exporte :** `POST` (push un seul contrat vers DocuSign)
- **Utilise par :** `src/app/fix/page.tsx` via fetch (apiCall)
- **Depend de :** `src/lib/db.ts` (prisma), `src/lib/auth.ts` (authenticate), `src/lib/pdf-converter.ts` (convertDocxToPdf), `src/lib/google-drive.ts` (downloadFile), `src/lib/docusign.ts` (getAccessToken, reactivatePowerForm), `process.env.DOCUSIGN_BASE_URL`, `process.env.DOCUSIGN_ACCOUNT_ID`
- **Body :** `{ "contractCode": "P1.P.CJ" }`
- **Detail :** Telecharge le DOCX depuis Drive, convertit en PDF via LibreOffice, met a jour le document dans le template DocuSign (PUT document/1), reactive le PowerForm.

---

## Pages

### `src/app/page.tsx`
- **Exporte :** `Home` (redirect vers /editor)
- **Utilise par :** Next.js routing
- **Depend de :** `next/navigation` (redirect)

### `src/app/login/page.tsx`
- **Exporte :** `LoginPage` (client component -- formulaire mot de passe, appelle POST /api/auth/login, redirige vers /editor)
- **Utilise par :** Next.js routing (affiche par le middleware si pas de session)
- **Depend de :** `react` (useState), `next/navigation` (useRouter)

### `src/app/editor/page.tsx`
- **Exporte :** `EditorPage` (client component -- liste articles en accordeon)
- **Utilise par :** Next.js routing
- **Depend de :** `react` (useState, useEffect), `src/types/index.ts` (Article, ApiResponse), `src/components/StepIndicator.tsx`, `src/components/ArticleEditor.tsx`

### `src/app/generate/page.tsx`
- **Exporte :** `GeneratePage` (client component -- bouton Generer, liste resultats DOCX, bouton Push DocuSign)
- **Utilise par :** Next.js routing
- **Depend de :** `react` (useState, useEffect), `next/navigation` (useRouter), `src/components/StepIndicator.tsx`
- **Detail :** Appelle POST /api/generate puis POST /api/push-docusign. Redirige vers /push apres push.

### `src/app/push/page.tsx`
- **Exporte :** `PushPage` (client component -- resultats push DocuSign avec liens PowerForm)
- **Utilise par :** Next.js routing
- **Depend de :** `react` (useState, useEffect), `src/components/StepIndicator.tsx`
- **Detail :** Recupere les resultats via sessionStorage (redirect depuis /generate) ou affiche les PowerForms existants depuis /api/contracts.

### `src/app/fix/page.tsx`
- **Exporte :** `FixPage` (client component -- correction unitaire : selectionne un contrat, ouvre dans Drive, push seul vers DocuSign)
- **Utilise par :** Next.js routing
- **Depend de :** `react` (useState, useEffect), `src/components/AuthProvider.tsx` (useAuth -> apiCall), `src/components/LogoutButton.tsx`
- **Detail :** Liste les contrats via GET /api/contracts, lien "Ouvrir dans Drive" vers Google Docs, bouton push via POST /api/push-docusign/single.

### `src/app/history/page.tsx`
- **Exporte :** `HistoryPage` (stub non implemente)
- **Utilise par :** Next.js routing
- **Depend de :** rien

---

## Scripts

### `prisma/seed.ts`
- **Exporte :** rien (script standalone -- seed des 18 contrats)
- **Utilise par :** `npx prisma db seed`
- **Depend de :** `dotenv`, `pg`, `@prisma/adapter-pg`, `src/generated/prisma/client`, `src/config/contracts.ts`

### `scripts/seed-articles.ts`
- **Exporte :** rien (script standalone -- seed des 41 articles avec texte juridique verbatim)
- **Utilise par :** `npx tsx scripts/seed-articles.ts`
- **Depend de :** `dotenv`, `pg`, `@prisma/adapter-pg`, `src/generated/prisma/client`
- **Impact :** Texte juridique verbatim. Ne JAMAIS reformuler le contenu.

### `scripts/test-docusign-auth.ts`
- **Exporte :** rien (script test -- verifie JWT auth + liste templates)
- **Utilise par :** `npx tsx scripts/test-docusign-auth.ts`
- **Depend de :** `dotenv`, `src/lib/docusign.ts` (getAccessToken, listTemplates)

### `scripts/test-docusign-create-template.ts`
- **Exporte :** rien (script test -- cree un template DocuSign a partir d'un contrat)
- **Utilise par :** `npx tsx scripts/test-docusign-create-template.ts`
- **Depend de :** `dotenv`, `pg`, `@prisma/adapter-pg`, `src/generated/prisma/client`, `src/lib/contract-assembler.ts`, `src/lib/docx-generator.ts`, `src/lib/docusign.ts`, `src/lib/pdf-converter.ts`, `src/types/index.ts`

### `scripts/test-pdf-conversion.ts`
- **Exporte :** rien (script test -- genere un DOCX et le convertit en PDF)
- **Utilise par :** `npx tsx scripts/test-pdf-conversion.ts`
- **Depend de :** `dotenv`, `fs`, `pg`, `@prisma/adapter-pg`, `src/generated/prisma/client`, `src/lib/contract-assembler.ts`, `src/lib/docx-generator.ts`, `src/lib/pdf-converter.ts`, `src/types/index.ts`

### `scripts/create-template-anchor.ts`
- **Exporte :** rien (script -- cree template DocuSign avec anchor tabs V7)
- **Utilise par :** `npx tsx scripts/create-template-anchor.ts`
- **Depend de :** `dotenv`, `pg`, `@prisma/adapter-pg`, `src/generated/prisma/client`, `src/lib/contract-assembler.ts`, `src/lib/docx-generator.ts`, `src/lib/pdf-converter.ts`, `src/lib/docusign.ts`, `src/types/index.ts`

### `scripts/inspect-prod-template.ts`
- **Exporte :** rien (script debug -- inspecte un template DocuSign existant via API)
- **Utilise par :** `npx tsx scripts/inspect-prod-template.ts`
- **Depend de :** `dotenv`, `fs`, `src/lib/docusign.ts` (getAccessToken)

### `scripts/map-docusign-templates.ts`
- **Exporte :** rien (fichier stub -- commentaire seulement)
- **Note :** Non implemente.

### `scripts/extract-styles.ts`
- **Exporte :** rien (fichier stub -- commentaire seulement)
- **Note :** Non implemente. Utilitaire de reference pour extraire les styles des DOCX existants.

---

## Templates DOCX (ne pas modifier sans raison)

### `src/templates/`
- **Contient :** `header1.xml`, `header1.xml.rels`, `footer1.xml`, `footer1.xml.rels`, `logo-header.png`, `paraphe-footer.jpg`, `pixel-black.png`
- **Utilise par :** `src/lib/docx-generator.ts` (injectTemplateHeaderFooter)
- **Detail :** Fichiers XML injectes dans le ZIP DOCX genere pour remplacer le header/footer par defaut. Le header contient le logo Letahost, le footer contient le paraphe.

---

## Fichiers de config (ne pas toucher sans raison)

| Fichier | Role | Toucher = danger ? |
|---------|------|---------------------|
| `next.config.mjs` | Config Next.js | Oui |
| `tailwind.config.ts` | Config Tailwind | Modere |
| `tsconfig.json` | Config TypeScript | Oui |
| `prisma/schema.prisma` | Schema DB | Oui -- toute modif = nouvelle migration |
| `prisma.config.ts` | Config Prisma 7 (datasource URL, seed) | Oui |
| `.env.local` | Variables d'env locales | Oui |
| `Dockerfile` | Image Docker custom (node:20-slim + LibreOffice + Helvetica Neue) | Oui |
| `railway.json` | Config Railway -- pointe vers Dockerfile | Oui |
| `nixpacks.toml` | Config Nixpacks -- installe libreoffice-core/writer | Oui |

### `src/app/layout.tsx`
- **Exporte :** `RootLayout` (layout global, wrape children dans `AuthProvider`)
- **Utilise par :** Next.js (layout racine)
- **Depend de :** `next/font/local` (Geist fonts), `src/components/AuthProvider.tsx`

---

> **Derniere mise a jour :** 2026-04-09
> **Mis a jour par :** Claude Code (mise a jour complete documentation)
