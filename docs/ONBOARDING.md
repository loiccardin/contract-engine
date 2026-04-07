# Onboarding — Contract Engine

> Ce document est le point d'entrée pour toute personne ou agent IA qui découvre ce projet.
> Lis-le EN ENTIER avant de toucher au code.

## Vue d'ensemble

**Quoi :** App web interne pour gérer 18 variantes de contrats de conciergerie Letahost — modifier un article une seule fois, générer les 18 DOCX, les pousser dans DocuSign en un clic.
**Pour qui :** Opératrice non-technique chez Invest Malin / Letahost
**Stack :** Next.js 14 (App Router) / PostgreSQL (Railway) / Tailwind / Railway / Prisma
**Repo :** [URL GitHub — à remplir]
**Production :** [URL prod — à remplir]
**Preview (dev) :** [URL Railway preview — à remplir]

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

## Variables d'environnement

| Variable | Description | Où la trouver |
|----------|-------------|---------------|
| `DATABASE_URL` | URL PostgreSQL | Railway > Service Postgres > Variables |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | JSON du Service Account Google Cloud | Console GCP > IAM > Service Accounts |
| `GOOGLE_DRIVE_OUTPUT_FOLDER_ID` | ID du dossier Drive de sortie | URL du dossier Drive |
| `GOOGLE_DRIVE_ARCHIVE_FOLDER_ID` | ID du dossier Drive d'archives | URL du dossier Drive |
| `DOCUSIGN_INTEGRATION_KEY` | Integration Key de l'app DocuSign | Admin DocuSign > Apps & Keys |
| `DOCUSIGN_USER_ID` | User ID de l'admin DocuSign | Admin DocuSign > Users |
| `DOCUSIGN_ACCOUNT_ID` | `6a35f214-1ce1-491c-87b6-8554f654f613` | Fixe |
| `DOCUSIGN_BASE_URL` | `https://eu.docusign.net/restapi` | Fixe (instance EU) |
| `DOCUSIGN_RSA_PRIVATE_KEY` | Clé RSA pour JWT Grant | Générée lors du setup DocuSign |
| `APP_SECRET` | Secret pour les sessions/tokens | Générer avec `openssl rand -hex 32` |

## Structure du projet

```
contract-engine/
├── src/
│   ├── app/                    # Routes Next.js (App Router)
│   │   ├── page.tsx            # Redirect vers /editor
│   │   ├── editor/             # Étape 1 : éditeur d'articles
│   │   ├── generate/           # Étape 2 : génération + relecture
│   │   ├── push/               # Étape 3 : push DocuSign
│   │   ├── history/            # Historique des versions
│   │   └── api/
│   │       ├── articles/       # CRUD articles
│   │       ├── generate/       # Génération des 18 DOCX
│   │       ├── push-docusign/  # Push vers DocuSign
│   │       └── versions/       # Historique
│   ├── components/             # Composants UI
│   │   ├── ArticleEditor.tsx   # Bloc article (accordéon + textarea)
│   │   ├── VariantTabs.tsx     # Onglets Classique/Studio/20%
│   │   ├── ContractList.tsx    # Liste des 18 avec statuts
│   │   ├── PreviewPanel.tsx    # Aperçu du contrat
│   │   └── StepIndicator.tsx   # Barre de progression 1-2-3
│   ├── lib/
│   │   ├── db.ts               # Client Prisma
│   │   ├── auth.ts             # Auth simple (token bearer)
│   │   ├── docx-generator.ts   # Génération DOCX avec la lib docx
│   │   ├── contract-assembler.ts # Logique d'assemblage article × variante
│   │   ├── google-drive.ts     # Upload/archive Google Drive
│   │   └── docusign.ts         # API DocuSign EU (JWT, update templates)
│   ├── config/
│   │   ├── contracts.ts        # Les 18 variantes (code, type, PowerFormId…)
│   │   └── styles.ts           # Styles DOCX (polices, marges, tailles)
│   ├── hooks/
│   └── types/
│       └── index.ts            # Types TypeScript
├── prisma/
│   └── schema.prisma           # Schéma DB PostgreSQL
├── scripts/
│   ├── seed-articles.ts        # Import initial des articles
│   ├── map-docusign-templates.ts
│   └── extract-styles.ts
├── docs/                       # Documentation (tu es ici)
├── public/
└── tests/
```

## Concept métier — Les 18 variantes

Les contrats de conciergerie ont 18 variantes qui combinent 3 axes :

- **Type de commission** : Classique (P1/P2), Studio (P3/P4), 20% (P5/P6)
- **Statut juridique** : Particulier (.P), Société (.S)
- **Ménage** : Zones Classiques & Jaunes (.CJ), Zones Rouges (.R), Sans ménage (P2/P4/P6)

Code de nommage : `P1.P.CJ` = Classique + Particulier + Zones CJ

Les 18 partagent ~95% du même texte. Seuls quelques articles/sections changent selon l'axe.

## Workflow en 3 étapes

1. **Modifier** — L'opératrice modifie un article dans l'éditeur structuré (une seule fois, les variantes sont gérées par onglets)
2. **Générer** — Le système génère les 18 DOCX avec mise en page contrôlée, les uploade dans Google Drive, et affiche une preview
3. **Pousser** — En un clic, les 18 documents remplacent les templates DocuSign existants. Les PowerForms restent inchangés.

## Points d'attention

- `lib/docx-generator.ts` — Cœur du projet. La mise en page doit être pixel-perfect par rapport aux contrats existants. Modifier avec extrême prudence.
- `lib/contract-assembler.ts` — Logique de sélection des variantes. Si un article est mal assemblé, le contrat signé sera faux. Critique.
- `lib/docusign.ts` — Instance EU (`eu.docusign.net`), pas US. JWT Grant obligatoire. Les anchor tabs (`/sn1/`, `/dt1/`) positionnent les zones de signature.
- `config/contracts.ts` — Contient les 18 codes, les PowerForm IDs et les Template IDs DocuSign. Source de vérité pour le mapping.
- Les migrations Prisma ne doivent JAMAIS être modifiées après push. Créer une nouvelle migration pour corriger.

## Documents à lire ensuite

1. `docs/AGENT-RULES.md` — **si tu es un agent IA, lis ça en premier**
2. `docs/ARCHITECTURE.md` — comment les composants interagissent
3. `docs/CONVENTIONS.md` — règles de code et Git
4. `docs/DEPENDENCIES.md` — carte "qui utilise quoi" (**OBLIGATOIRE** avant de modifier du code)
5. `docs/API.md` — endpoints REST
6. `docs/DATA-MODEL.md` — schéma base de données
7. `docs/DECISIONS.md` — pourquoi les choix ont été faits
