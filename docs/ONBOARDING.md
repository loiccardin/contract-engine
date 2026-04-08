# Onboarding -- Contract Engine

> Ce document est le point d'entree pour toute personne ou agent IA qui decouvre ce projet.
> Lis-le EN ENTIER avant de toucher au code.

## Vue d'ensemble

**Quoi :** App web interne pour gerer 18 variantes de contrats de conciergerie Letahost -- modifier un article une seule fois, generer les 18 DOCX, les convertir en PDF, et les pousser dans DocuSign en un clic.
**Pour qui :** Operatrice non-technique chez Invest Malin / Letahost
**Stack :** Next.js 14 (App Router) / PostgreSQL (Railway) / Tailwind / Railway / Prisma / LibreOffice headless / Docker
**Repo :** [URL GitHub]
**Production :** [URL prod]
**Preview (dev) :** [URL Railway preview]

## Comment lancer en local

```bash
git clone [REPO_URL]
cd contract-engine
npm install
cp .env.example .env.local
# Remplir les variables d'env (voir section ci-dessous)
npx prisma generate
npx prisma db push
npm run dev
```

> Note : pour la conversion PDF, LibreOffice doit etre installe localement.
> Sur macOS : `brew install --cask libreoffice`
> Le binaire est detecte automatiquement dans `/Applications/LibreOffice.app/Contents/MacOS/soffice`.

## Variables d'environnement

| Variable | Description | Ou la trouver |
|----------|-------------|---------------|
| `DATABASE_URL` | URL PostgreSQL | Railway > Service Postgres > Variables |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | JSON complet du Service Account Google Cloud | Console GCP > IAM > Service Accounts |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | ID du dossier racine Drive (Shared Drive) | URL du dossier Drive |
| `GOOGLE_DRIVE_ARCHIVE_FOLDER_ID` | ID du dossier d'archives dans Drive | URL du dossier Drive |
| `DOCUSIGN_INTEGRATION_KEY` | Integration Key de l'app DocuSign | Admin DocuSign > Apps & Keys |
| `DOCUSIGN_USER_ID` | User ID de l'admin DocuSign | Admin DocuSign > Users |
| `DOCUSIGN_ACCOUNT_ID` | `6a35f214-1ce1-491c-87b6-8554f654f613` | Fixe |
| `DOCUSIGN_BASE_URL` | `https://eu.docusign.net/restapi` | Fixe (instance EU) |
| `DOCUSIGN_RSA_PRIVATE_KEY` | Cle RSA pour JWT Grant (avec `\n` pour les retours a la ligne) | Generee lors du setup DocuSign |
| `APP_SECRET` | Token d'authentification pour l'app | Generer avec `openssl rand -hex 32` |

## Structure du projet

```
contract-engine/
|-- src/
|   |-- app/                    # Routes Next.js (App Router)
|   |   |-- page.tsx            # Redirect vers /editor
|   |   |-- layout.tsx          # Layout global
|   |   |-- globals.css         # Styles Tailwind globaux
|   |   |-- editor/             # Etape 1 : editeur d'articles
|   |   |-- generate/           # Etape 2 : generation + relecture + push
|   |   |-- generate-test/      # Page test (temporaire)
|   |   |-- push/               # Etape 3 : resultats push DocuSign + PowerForms
|   |   |-- history/            # Historique des versions (stub)
|   |   |-- fonts/              # Polices Geist + Helvetica Neue (.woff, .ttc)
|   |   +-- api/
|   |       |-- articles/       # GET liste, GET/:id, PUT/:id
|   |       |-- contracts/      # GET liste des 18
|   |       |-- generate/       # POST generation 18 DOCX + upload Drive
|   |       |-- push-docusign/  # POST DOCX->PDF->DocuSign + upload PDF Drive
|   |       |-- versions/       # GET historique (stub)
|   |       |-- generate-test/  # POST un seul DOCX (temporaire)
|   |       +-- generate-test-all/ # POST 18 DOCX en ZIP (temporaire)
|   |-- components/             # Composants UI
|   |   |-- ArticleEditor.tsx   # Bloc article (accordeon + textarea + save)
|   |   |-- VariantTabs.tsx     # Onglets Classique/Studio/20% / Particulier/Societe / etc.
|   |   |-- ContractList.tsx    # Stub (non implemente)
|   |   |-- PreviewPanel.tsx    # Stub (non implemente)
|   |   +-- StepIndicator.tsx   # Barre de progression 1-2-3
|   |-- lib/
|   |   |-- db.ts               # Client Prisma (pg adapter)
|   |   |-- auth.ts             # Auth simple (token bearer)
|   |   |-- docx-generator.ts   # Generation DOCX avec la lib docx + injection header/footer
|   |   |-- contract-assembler.ts # Logique d'assemblage article x variante
|   |   |-- google-drive.ts     # Upload/archive/download Google Drive (Shared Drive)
|   |   |-- docusign.ts         # API DocuSign EU (JWT Grant, templates, PowerForms)
|   |   +-- pdf-converter.ts    # Conversion DOCX->PDF via LibreOffice headless
|   |-- config/
|   |   |-- contracts.ts        # Les 18 variantes (code, commissionType, statutType, menageType)
|   |   +-- styles.ts           # Styles DOCX (Helvetica Neue 10pt, A4, marges, espacement)
|   |-- templates/              # Fichiers XML header/footer + images injectes dans le DOCX
|   |   |-- header1.xml         # Header XML avec logo Letahost
|   |   |-- footer1.xml         # Footer XML avec paraphe + numero de page
|   |   |-- header1.xml.rels    # Relations header
|   |   |-- footer1.xml.rels    # Relations footer
|   |   |-- logo-header.png     # Logo Letahost pour le header
|   |   |-- paraphe-footer.jpg  # Paraphe Loic pour le footer
|   |   +-- pixel-black.png     # Pixel noir pour le trait du footer
|   +-- types/
|       +-- index.ts            # Types TypeScript (Article, Contract, AssembledArticle, ApiResponse)
|-- prisma/
|   |-- schema.prisma           # Schema DB PostgreSQL (3 tables)
|   |-- migrations/             # Migrations Prisma
|   +-- seed.ts                 # Seed des 18 contrats
|-- scripts/
|   |-- seed-articles.ts        # Seed des 41 articles (texte juridique verbatim)
|   |-- create-template-anchor.ts    # Cree template DocuSign avec anchor tabs V7
|   |-- test-docusign-auth.ts        # Test JWT auth DocuSign
|   |-- test-docusign-create-template.ts # Test creation template + PowerForm
|   |-- test-pdf-conversion.ts       # Test conversion DOCX->PDF
|   |-- inspect-prod-template.ts     # Debug : inspecte un template DocuSign existant
|   |-- map-docusign-templates.ts    # Stub : mapping templates DocuSign
|   |-- extract-styles.ts            # Stub : extraction styles DOCX
|   +-- reference-tabs-config.json   # Config de reference des tabs DocuSign
|-- fonts/
|   +-- HelveticaNeue.ttc       # Police custom pour Docker
|-- public/
|   +-- images/
|       |-- letahost-logo.png   # Logo Letahost
|       |-- tampon-letahost.png # Tampon signature
|       +-- paraphe-lc.jpeg     # Paraphe Loic
|-- docs/                       # Documentation (tu es ici)
|-- Dockerfile                  # Image Docker : node:20-slim + LibreOffice + Helvetica Neue
|-- railway.json                # Config Railway -> pointe vers Dockerfile
|-- nixpacks.toml               # Fallback Nixpacks (apt install libreoffice)
+-- .env.example                # Template des variables d'environnement
```

## Concept metier -- Les 18 variantes

Les contrats de conciergerie ont 18 variantes qui combinent 3 axes :

- **Type de commission** : Classique (P1/P2), Studio (P3/P4), 20% (P5/P6)
- **Statut juridique** : Particulier (.P), Societe (.S)
- **Menage** : Zones Classiques & Jaunes (.CJ), Zones Rouges (.R), Sans menage (P2/P4/P6)

Code de nommage : `P1.P.CJ` = Classique + Particulier + Zones CJ

Les 18 partagent ~95% du meme texte. Seuls quelques articles/sections changent selon l'axe.
La base contient 41 articles, dont certains ont du contenu conditionnel par axe de variation.

## Workflow en 3 etapes

1. **Modifier** (`/editor`) -- L'operatrice modifie un article dans l'editeur structure (une seule fois, les variantes sont gerees par onglets). Sauvegarde instantanee par article via PUT /api/articles/:id.

2. **Generer** (`/generate`) -- Le systeme :
   - Archive les anciens dossiers Drive
   - Genere les 18 DOCX avec mise en page controlee (Helvetica Neue, header/footer custom)
   - Uploade les DOCX natifs dans Google Drive (PAS de conversion Google Doc)
   - L'operatrice verifie les DOCX dans Drive avant de continuer
   - Clic sur "Generer les PDFs et pousser dans DocuSign" pour lancer l'etape suivante

3. **Pousser** (declenche depuis `/generate`, resultats sur `/push`) -- Le systeme :
   - Telecharge chaque DOCX depuis Drive
   - Convertit en PDF via LibreOffice headless
   - Uploade le PDF dans Drive
   - Cree ou met a jour le template DocuSign
   - Cree ou reactive le PowerForm
   - Affiche les liens PowerForm sur la page /push

## Points d'attention

- `lib/docx-generator.ts` -- Coeur du projet. La mise en page doit etre fidele aux contrats existants (Helvetica Neue 10pt, A4, marges specifiques). Le header/footer est injecte via post-processing ZIP (fichiers XML dans `src/templates/`). Modifier avec extreme prudence.
- `lib/contract-assembler.ts` -- Logique de selection des variantes + numerotation dynamique 2.2.x/2.4.x. Si un article est mal assemble, le contrat signe sera faux. Critique.
- `lib/pdf-converter.ts` -- LibreOffice headless avec timeout 30s. Necessite LibreOffice installe (Docker en prod, installation locale en dev).
- `lib/docusign.ts` -- Instance EU (`eu.docusign.net`), pas US. JWT Grant obligatoire. Les anchor tabs (texte blanc invisible) positionnent les zones de signature et de saisie.
- `lib/google-drive.ts` -- Fonctionne avec un Shared Drive (supportsAllDrives: true partout). Les DOCX sont uploades natifs (pas de conversion Google Doc).
- `config/contracts.ts` -- Contient les 18 variantes avec leurs types. Source de verite pour le mapping. Les PowerForm IDs et Template IDs sont stockes en DB.
- `push-docusign/route.ts` -- Contient la config complete des anchor tabs DocuSign (V7) avec les offsets et styles. C'est la reference pour le placement des champs.
- Les migrations Prisma ne doivent JAMAIS etre modifiees apres push. Creer une nouvelle migration pour corriger.

## Documents a lire ensuite

1. `docs/AGENT-RULES.md` -- **si tu es un agent IA, lis ca en premier**
2. `docs/ARCHITECTURE.md` -- comment les composants interagissent
3. `docs/CONVENTIONS.md` -- regles de code et Git
4. `docs/DEPENDENCIES.md` -- carte "qui utilise quoi" (**OBLIGATOIRE** avant de modifier du code)
5. `docs/API.md` -- endpoints REST
6. `docs/DATA-MODEL.md` -- schema base de donnees
7. `docs/DECISIONS.md` -- pourquoi les choix ont ete faits

---

> **Derniere mise a jour :** 2026-04-09
