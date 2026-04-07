#!/bin/bash
mkdir -p docs

cat > "docs/ONBOARDING.md" << 'HEREDOC_ONBOARDING_md'
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
HEREDOC_ONBOARDING_md

cat > "docs/AGENT-RULES.md" << 'HEREDOC_AGENT_RULES_md'
# Règles agent — Contract Engine

> Ce document s'adresse à tout agent IA (Claude Code, Cursor, Copilot, Aider, ou autre)
> qui travaille sur ce projet. Les règles sont universelles et ne dépendent d'aucun outil.

## Identité

Tu es un développeur exécutant, pas un architecte. Tu codes ce qu'on te demande, tu ne prends pas d'initiatives sur la structure, l'architecture, ou les choix techniques. Si tu as un doute, tu demandes avant d'agir.

## Règles absolues

1. **Consulte `docs/DEPENDENCIES.md` AVANT de modifier tout fichier source.** Si d'autres fichiers dépendent de celui que tu modifies, vérifie-les TOUS.
2. **Un commit après chaque changement fonctionnel.** Format : `type: description courte`. Types : feat / fix / refactor / docs / test / chore. Ne jamais attendre qu'on te le demande.
3. **Jamais toucher `main`.** Tu travailles sur `dev` ou sur `feature/nom-court` depuis `dev`.
4. **Jamais de merge sans validation explicite de Loïc.**
5. **Le code sans documentation mise à jour n'est PAS terminé.** Si tu modifies du code, tu mets à jour les docs concernées (API.md, DATA-MODEL.md, DEPENDENCIES.md, etc.).
6. **Les tests doivent passer avant tout push.** Lancer `npm test` (ou l'équivalent du projet). Si ça échoue, corriger et relancer.

## Ce que tu ne fais JAMAIS sans autorisation explicite

- Ajouter une dépendance (npm, pip, cargo, ou autre gestionnaire de paquets)
- Changer la structure de la base de données (nouvelle table, nouvelle colonne, migration)
- Modifier un fichier d'environnement (.env, .env.local, etc.)
- Refactorer du code qui fonctionne
- Renommer ou déplacer un fichier existant
- Modifier la config de déploiement (Railway, Docker, CI/CD)
- Changer la version de Node, Python, ou tout runtime
- Modifier les fichiers de config racine (tsconfig, next.config, tailwind.config, prisma/schema.prisma, etc.)

## Avant de coder

Quand on te donne une tâche :
1. Dis quels fichiers tu vas modifier
2. Vérifie `docs/DEPENDENCIES.md` pour chacun de ces fichiers
3. Liste les fichiers qui dépendent de ceux que tu modifies
4. Présente ton plan et attends la validation

## Après avoir codé

1. Lance les tests
2. Mets à jour `docs/DEPENDENCIES.md` si tu as ajouté/modifié des imports
3. Mets à jour la documentation concernée
4. Commit au format `type: description`
5. Push
6. Poste la checklist de livraison (voir `docs/CONVENTIONS.md`)

## Gestion des erreurs

- Si tu rencontres une erreur que tu ne comprends pas → décris-la, ne tente pas de la corriger par tâtonnement
- Si un test échoue après ta modification → reviens en arrière (`git checkout .`) et explique le problème
- Si tu vois du code qui te semble bugué mais qui n'est pas dans le scope de ta tâche → signale-le, ne le corrige pas

## Communication

Après chaque push, communique :
- Ce qui a été fait (résumé en une phrase)
- Les fichiers modifiés
- L'URL preview si applicable : 🔗 Preview : [URL]
- La checklist de livraison complète
HEREDOC_AGENT_RULES_md

cat > "docs/ARCHITECTURE.md" << 'HEREDOC_ARCHITECTURE_md'
# Architecture — Contract Engine

## Vue d'ensemble

```
[Opératrice — Browser]
       │
       ▼
[Next.js App Router]  ──►  [Middleware: auth check (token bearer)]
       │
       ├── /app/editor/           → Éditeur d'articles (CRUD)
       ├── /app/generate/         → Génération des 18 DOCX + preview
       ├── /app/push/             → Push vers DocuSign
       ├── /app/history/          → Historique des versions
       │
       ├── /app/api/articles/*    → CRUD articles (PostgreSQL)
       ├── /app/api/generate      → Assemblage + génération DOCX + upload Drive
       ├── /app/api/push-docusign → Archive + update templates DocuSign
       └── /app/api/versions/*    → Historique des versions
                │
                ▼
       ┌────────────────────┐
       │   PostgreSQL        │  Tables : articles, contracts, versions
       │   (Railway)         │  Pas de RLS (app interne, auth par token)
       └────────────────────┘
                │
       ┌────────┴────────────────────────────┐
       │                                     │
       ▼                                     ▼
┌──────────────┐                   ┌──────────────────┐
│ Google Drive │                   │ DocuSign EU      │
│ API v3       │                   │ eSignature API   │
│              │                   │                  │
│ - Upload     │                   │ - JWT Grant auth │
│   DOCX→GDoc  │                   │ - Update template│
│ - Archive    │                   │   documents      │
│ - Créer      │                   │ - PowerForms     │
│   dossiers   │                   │   inchangés      │
└──────────────┘                   └──────────────────┘
```

## Flux de données principaux

### Authentification
```
Opératrice → Login (token bearer) → Middleware vérifie APP_SECRET → Accès autorisé
```
Auth simple : pas de multi-users, pas de rôles. Un seul token partagé par l'équipe.

### Flux principal : Modification → Génération → Push

```
1. MODIFIER
   Opératrice → Modifie article dans l'éditeur
   → PUT /api/articles/:id → UPDATE articles SET content_xxx WHERE id

2. GÉNÉRER (POST /api/generate)
   Pour chaque contrat (×18) :
   a. contract-assembler.ts sélectionne les bons contenus selon (commission, statut, ménage)
   b. docx-generator.ts génère le DOCX avec mise en page contrôlée (lib docx npm)
   c. google-drive.ts uploade le DOCX dans Drive (conversion → Google Doc)
   d. google-drive.ts exporte en PDF pour preview
   → Retourne liste des 18 avec statuts + liens

3. POUSSER (POST /api/push-docusign)
   a. google-drive.ts archive les 18 Google Docs actuels dans un sous-dossier daté
   b. Pour chaque contrat (×18) :
      - docusign.ts récupère le template DocuSign
      - docusign.ts uploade le nouveau document dans le template
      - Les anchor tabs (/sn1/, /dt1/) repositionnent les signatures automatiquement
   c. Les PowerForms restent inchangés (pointent vers les templates, pas les documents)
   d. INSERT versions (numéro, description, dossier archive)
```

### Logique d'assemblage (contract-assembler.ts)

Pour un contrat donné (ex: P1.P.CJ = Classique + Particulier + Zones CJ) :

```
Pour chaque article trié par order_index :
  Si scope = 'common'     → utiliser content_common
  Si scope = 'commission' → utiliser content_classique (car P1 = Classique)
  Si scope = 'statut'     → utiliser content_particulier (car .P = Particulier)
  Si scope = 'menage'     → utiliser content_zones_cj (car .CJ = Zones CJ)
  Si le contenu sélectionné est NULL → article absent de cette variante (ex: section ménage pour P2)
```

## Services externes

| Service | Usage | Config | Doc |
|---------|-------|--------|-----|
| PostgreSQL (Railway) | DB : articles, contracts, versions | `DATABASE_URL` dans `.env.local` | `docs/DATA-MODEL.md` |
| Railway | Hébergement app + DB | Dashboard Railway | railway.app |
| Google Drive API v3 | Upload DOCX → GDoc, archivage, export PDF | `GOOGLE_SERVICE_ACCOUNT_KEY` | developers.google.com/drive |
| DocuSign eSignature API | Update templates, JWT auth | `DOCUSIGN_*` vars, instance EU | developers.docusign.com |
| Prisma | ORM PostgreSQL | `prisma/schema.prisma` | prisma.io/docs |

## Décisions d'architecture

Voir `docs/DECISIONS.md` pour le journal des choix techniques et leurs justifications.
HEREDOC_ARCHITECTURE_md

cat > "docs/DATA-MODEL.md" << 'HEREDOC_DATA_MODEL_md'
# Modèle de données — Contract Engine

> Schéma complet de la base de données. Mettre à jour à CHAQUE migration.

## Vue d'ensemble des relations

```
articles (template maître)
  │
  │  Pas de FK directe — la relation est logique :
  │  contract-assembler.ts sélectionne le bon contenu
  │  de chaque article selon le type du contrat
  │
contracts (les 18 variantes)
  │
  │  Pas de FK vers articles — le mapping est par code/type
  │
versions (historique des pushs)
     │
     └── Indépendante — log de chaque push DocuSign
```

## Tables

### `articles`
Stocke le contenu de chaque article/section du template maître. Le scope détermine quel champ `content_*` est utilisé.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | SERIAL | PK | Identifiant unique |
| `code` | VARCHAR(50) | NOT NULL | Code unique de l'article. Ex: `art_1`, `art_2_4_1`, `en_tete`, `bloc_signature` |
| `title` | VARCHAR(255) | NOT NULL | Titre affiché. Ex: `Article 1 — Objet du contrat` |
| `order_index` | INTEGER | NOT NULL | Ordre d'affichage dans le contrat |
| `scope` | VARCHAR(20) | NOT NULL, DEFAULT 'common' | Axe de variation : `common`, `commission`, `statut`, `menage` |
| `content_common` | TEXT | | Contenu si scope = `common` |
| `content_classique` | TEXT | | Variante Classique (P1/P2) si scope = `commission` |
| `content_studio` | TEXT | | Variante Studio (P3/P4) si scope = `commission` |
| `content_20pct` | TEXT | | Variante 20% (P5/P6) si scope = `commission` |
| `content_particulier` | TEXT | | Variante Particulier (.P) si scope = `statut` |
| `content_societe` | TEXT | | Variante Société (.S) si scope = `statut` |
| `content_zones_cj` | TEXT | | Variante Zones Classiques & Jaunes (.CJ) si scope = `menage` |
| `content_zones_r` | TEXT | | Variante Zones Rouges (.R) si scope = `menage` |
| `content_sans_menage` | TEXT | | Variante Sans ménage (P2/P4/P6). NULL = section absente de cette variante |
| `is_page_break_before` | BOOLEAN | DEFAULT FALSE | Saut de page forcé avant cet article |
| `keep_together` | BOOLEAN | DEFAULT TRUE | Ne jamais couper cet article entre 2 pages |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Dernière modification |

**Logique de scope :**
- `common` → même contenu pour les 18 → lire `content_common`
- `commission` → varie selon le type de commission → lire `content_classique` OU `content_studio` OU `content_20pct`
- `statut` → varie selon le statut juridique → lire `content_particulier` OU `content_societe`
- `menage` → varie selon le type de ménage → lire `content_zones_cj` OU `content_zones_r` OU `content_sans_menage`

**Index :**
- `idx_articles_code` UNIQUE sur `code`
- `idx_articles_order` sur `order_index`

---

### `contracts`
Les 18 variantes et leur mapping vers Google Drive et DocuSign.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | SERIAL | PK | Identifiant unique |
| `code` | VARCHAR(20) | NOT NULL, UNIQUE | Code de la variante. Ex: `P1.P.CJ` |
| `commission_type` | VARCHAR(20) | NOT NULL | `classique`, `studio`, `20pct` |
| `statut_type` | VARCHAR(20) | NOT NULL | `particulier`, `societe` |
| `menage_type` | VARCHAR(20) | NOT NULL | `zones_cj`, `zones_r`, `sans_menage` |
| `google_doc_id` | VARCHAR(100) | | ID du Google Doc généré (mis à jour après chaque génération) |
| `docusign_template_name` | VARCHAR(255) | | Nom du template DocuSign côté front |
| `docusign_powerform_id` | VARCHAR(100) | | ID du PowerForm (fixe, ne change jamais) |
| `docusign_template_id` | VARCHAR(100) | | ID du template DocuSign (récupéré via API) |

**Index :**
- `idx_contracts_code` UNIQUE sur `code` (implicite via contrainte UNIQUE)

**Données initiales :** Les 18 lignes sont seedées au setup avec les Google Doc IDs actuels et les PowerForm IDs. Les `docusign_template_id` sont récupérés via le script `map-docusign-templates.ts`.

---

### `versions`
Historique de chaque push vers DocuSign.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | SERIAL | PK | Identifiant unique |
| `version_number` | INTEGER | NOT NULL | Numéro incrémental |
| `description` | TEXT | | Description du changement. Ex: `MAJ articles 2.4.1, 2.8, 3.1` |
| `archive_drive_folder_id` | VARCHAR(100) | | ID du dossier d'archive dans Google Drive |
| `pushed_at` | TIMESTAMP | DEFAULT NOW() | Date du push |
| `pushed_by` | VARCHAR(100) | | Qui a poussé (identifiant simple) |

**Index :**
- `idx_versions_number` sur `version_number` DESC

---

## Prisma Schema

```prisma
model Article {
  id                  Int      @id @default(autoincrement())
  code                String   @unique @db.VarChar(50)
  title               String   @db.VarChar(255)
  orderIndex          Int      @map("order_index")
  scope               String   @default("common") @db.VarChar(20)
  contentCommon       String?  @map("content_common")
  contentClassique    String?  @map("content_classique")
  contentStudio       String?  @map("content_studio")
  content20pct        String?  @map("content_20pct")
  contentParticulier  String?  @map("content_particulier")
  contentSociete      String?  @map("content_societe")
  contentZonesCj      String?  @map("content_zones_cj")
  contentZonesR       String?  @map("content_zones_r")
  contentSansMenage   String?  @map("content_sans_menage")
  isPageBreakBefore   Boolean  @default(false) @map("is_page_break_before")
  keepTogether        Boolean  @default(true) @map("keep_together")
  updatedAt           DateTime @default(now()) @updatedAt @map("updated_at")

  @@map("articles")
  @@index([orderIndex], map: "idx_articles_order")
}

model Contract {
  id                    Int     @id @default(autoincrement())
  code                  String  @unique @db.VarChar(20)
  commissionType        String  @map("commission_type") @db.VarChar(20)
  statutType            String  @map("statut_type") @db.VarChar(20)
  menageType            String  @map("menage_type") @db.VarChar(20)
  googleDocId           String? @map("google_doc_id") @db.VarChar(100)
  docusignTemplateName  String? @map("docusign_template_name") @db.VarChar(255)
  docusignPowerformId   String? @map("docusign_powerform_id") @db.VarChar(100)
  docusignTemplateId    String? @map("docusign_template_id") @db.VarChar(100)

  @@map("contracts")
}

model Version {
  id                    Int      @id @default(autoincrement())
  versionNumber         Int      @map("version_number")
  description           String?
  archiveDriveFolderId  String?  @map("archive_drive_folder_id") @db.VarChar(100)
  pushedAt              DateTime @default(now()) @map("pushed_at")
  pushedBy              String?  @map("pushed_by") @db.VarChar(100)

  @@map("versions")
  @@index([versionNumber(sort: Desc)], map: "idx_versions_number")
}
```

---

## Migrations

Les migrations sont gérées par Prisma (`prisma/migrations/`).
Ne JAMAIS modifier une migration existante — créer une nouvelle migration pour corriger.

| Migration | Date | Description |
|-----------|------|-------------|
| `001_init` | 2026-04-07 | Tables initiales : articles, contracts, versions |

---

> **Dernière mise à jour :** 2026-04-07
HEREDOC_DATA_MODEL_md

cat > "docs/API.md" << 'HEREDOC_API_md'
# API — Contract Engine

> Tous les endpoints REST du projet. Mettre à jour à CHAQUE ajout/modification de route.

## Base URL

- **Local :** `http://localhost:3000/api`
- **Preview :** [URL Railway dev]/api
- **Production :** [URL prod]/api

## Authentification

Toutes les routes nécessitent un header `Authorization: Bearer {APP_SECRET}`.
Réponse si non authentifié : `401 { success: false, error: "Non authentifié" }`

## Format de réponse standard

```json
// Succès
{ "success": true, "data": { ... } }

// Erreur
{ "success": false, "error": "Message d'erreur lisible" }
```

---

## Endpoints

### Articles

#### `GET /api/articles`
**Description :** Liste tous les articles du template maître, triés par `order_index`
**Auth :** Requise

**Réponse 200 :**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "code": "art_1",
      "title": "Article 1 — Objet du contrat",
      "order_index": 10,
      "scope": "common",
      "content_common": "Le présent contrat...",
      "content_classique": null,
      "content_studio": null,
      "content_20pct": null,
      "content_particulier": null,
      "content_societe": null,
      "content_zones_cj": null,
      "content_zones_r": null,
      "content_sans_menage": null,
      "is_page_break_before": false,
      "keep_together": true,
      "updated_at": "2026-04-07T10:00:00Z"
    }
  ]
}
```

#### `GET /api/articles/:id`
**Description :** Récupère un article par son ID
**Auth :** Requise

**Réponse 200 :**
```json
{ "success": true, "data": { "id": 1, "code": "art_1", ... } }
```

**Réponse 404 :**
```json
{ "success": false, "error": "Article non trouvé" }
```

#### `PUT /api/articles/:id`
**Description :** Met à jour le contenu d'un article
**Auth :** Requise
**Body :**
```json
{
  "title": "string (optionnel)",
  "content_common": "string (optionnel)",
  "content_classique": "string (optionnel)",
  "content_studio": "string (optionnel)",
  "content_20pct": "string (optionnel)",
  "content_particulier": "string (optionnel)",
  "content_societe": "string (optionnel)",
  "content_zones_cj": "string (optionnel)",
  "content_zones_r": "string (optionnel)",
  "content_sans_menage": "string | null (optionnel)",
  "is_page_break_before": "boolean (optionnel)",
  "keep_together": "boolean (optionnel)"
}
```
> Seuls les champs envoyés sont mis à jour. Les autres restent inchangés.

**Réponse 200 :**
```json
{ "success": true, "data": { "id": 1, "code": "art_1", ... , "updated_at": "2026-04-07T12:00:00Z" } }
```

---

### Génération

#### `POST /api/generate`
**Description :** Génère les 18 DOCX, les uploade dans Google Drive comme Google Docs, et exporte les PDFs de preview
**Auth :** Requise
**Body :** aucun

**Traitement :**
1. Récupère tous les articles (triés par order_index)
2. Récupère les 18 contrats depuis la table `contracts`
3. Pour chaque contrat : assemble → génère DOCX → uploade Drive → exporte PDF
4. Retourne la liste des 18 avec statuts

**Réponse 200 :**
```json
{
  "success": true,
  "data": {
    "generated_at": "2026-04-07T12:00:00Z",
    "contracts": [
      {
        "code": "P1.P.CJ",
        "status": "ok",
        "google_doc_url": "https://docs.google.com/document/d/...",
        "pdf_url": "https://drive.google.com/file/d/.../view",
        "article_count": 25
      }
    ],
    "errors": []
  }
}
```

**Réponse 500 (erreur partielle) :**
```json
{
  "success": true,
  "data": {
    "contracts": [...],
    "errors": [
      { "code": "P3.S.R", "error": "Google Drive upload failed: quota exceeded" }
    ]
  }
}
```

---

### Push DocuSign

#### `POST /api/push-docusign`
**Description :** Archive les docs actuels dans Drive, puis met à jour les 18 templates DocuSign avec les nouveaux documents
**Auth :** Requise
**Body :**
```json
{
  "description": "string (requis) — ex: MAJ articles 2.4.1, 2.8, 3.1"
}
```

**Traitement :**
1. Crée un dossier d'archive daté dans Drive
2. Copie les 18 Google Docs actuels dans le dossier d'archive
3. Pour chaque contrat : uploade le nouveau document dans le template DocuSign
4. Enregistre la version dans la table `versions`

**Réponse 200 :**
```json
{
  "success": true,
  "data": {
    "version_number": 14,
    "description": "MAJ articles 2.4.1, 2.8, 3.1",
    "archive_folder_url": "https://drive.google.com/drive/folders/...",
    "pushed_at": "2026-04-07T14:00:00Z",
    "results": [
      { "code": "P1.P.CJ", "status": "ok", "template_id": "..." },
      { "code": "P1.P.R", "status": "ok", "template_id": "..." }
    ],
    "errors": []
  }
}
```

---

### Versions (historique)

#### `GET /api/versions`
**Description :** Liste l'historique des pushs, du plus récent au plus ancien
**Auth :** Requise

**Réponse 200 :**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "version_number": 14,
      "description": "MAJ articles 2.4.1, 2.8, 3.1",
      "archive_drive_folder_id": "...",
      "archive_folder_url": "https://drive.google.com/drive/folders/...",
      "pushed_at": "2026-04-07T14:00:00Z",
      "pushed_by": "loic"
    }
  ]
}
```

---

### Contrats (référentiel)

#### `GET /api/contracts`
**Description :** Liste les 18 variantes avec leur mapping DocuSign et Google Drive
**Auth :** Requise

**Réponse 200 :**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "code": "P1.P.CJ",
      "commission_type": "classique",
      "statut_type": "particulier",
      "menage_type": "zones_cj",
      "google_doc_id": "1hyOICOEfp5Y98_...",
      "docusign_template_name": "LETAHOST LLC - Promesse - PRINCIPALE - PARTICULIER - Zones Classiques et Jaunes - Février 2026",
      "docusign_powerform_id": "e2bac1a9-0519-4c76-a377-f93022415119",
      "docusign_template_id": "..."
    }
  ]
}
```

---

> **Dernière mise à jour :** 2026-04-07
HEREDOC_API_md

cat > "docs/CONVENTIONS.md" << 'HEREDOC_CONVENTIONS_md'
# Conventions — Contract Engine

## Code

**Langue du code :** anglais (variables, fonctions, commentaires)
**Langue des commits :** français
**Langue de la documentation :** français

### TypeScript / Next.js

- Typage strict : pas de `any`, pas de `as` sauf cas documenté dans DECISIONS.md
- Composants : un fichier = un composant exporté par défaut
- Imports : absolus avec `@/` (pas de `../../../`)
- Pas de `console.log` en production — utiliser un logger structuré
- Pas de `// TODO` sans issue GitHub associée
- ORM : Prisma uniquement, pas de requêtes SQL raw sauf cas documenté

### Nommage

- Fichiers composants : `PascalCase.tsx`
- Fichiers utilitaires : `camelCase.ts`
- Variables d'env : `UPPER_SNAKE_CASE`
- Tables DB : `snake_case` (mapping Prisma avec `@@map`)
- Routes API : `kebab-case`

## Git

### Branches

Branche de travail : tout se fait sur `dev`, jamais sur `main` directement.
Si la tâche est complexe ou risquée : créer `feature/nom-court` depuis `dev`.

### Commits

Un commit après chaque changement fonctionnel. C'est AUTOMATIQUE, pas sur demande.
Format : `type: description courte en français`
Types autorisés : `feat`, `fix`, `refactor`, `docs`, `test`, `chore`
Un commit = une seule intention. Jamais de code cassé committé.

### Flow de livraison (CHAQUE modification)

1. Coder sur `dev` ou `feature/xxx`
2. Lancer les tests : `npm test` — si échec, corriger et relancer
3. Mettre à jour `docs/DEPENDENCIES.md` si tu as modifié des imports ou des relations entre fichiers
4. Mettre à jour la documentation concernée (`API.md`, `DATA-MODEL.md`, etc.)
5. Commit au format `type: description`
6. Push la branche
7. Créer une PR vers `dev` (si feature branch) ou informer Loïc (si directement sur dev)
8. Poster la checklist de livraison (voir ci-dessous)
9. **JAMAIS de merge sans accord explicite de Loïc**

### Checklist de livraison

Poster ceci dans le canal de communication AVANT de dire "c'est fait" :

```
☐ Branche : [nom de la branche]
☐ Commits format feat/fix/refactor: description
☐ Tests passent (npm test)
☐ docs/DEPENDENCIES.md à jour
☐ docs/ à jour (quels fichiers modifiés : ...)
☐ PR créée — lien : [URL]
☐ Preview : [URL Railway]
☐ En attente validation Loïc — pas de merge auto
```

### Preview Railway

Après chaque push, communiquer l'URL preview dans ce format :
🔗 Preview : [URL]
Une tâche n'est JAMAIS terminée sans que Loïc ait vu et validé la preview.

## Dépendances externes

Ne JAMAIS ajouter une dépendance npm sans demander à Loïc.
Avant d'utiliser un package, vérifier :
- Est-il déjà dans le projet ? (`package.json`)
- Peut-on faire sans ? (vanilla JS/TS ou lib existante)
- Dernier commit sur le repo < 6 mois ?
- Plus de 1000 stars GitHub ?

**Dépendances clés autorisées :**
- `docx` (npm) — génération DOCX
- `prisma` + `@prisma/client` — ORM
- `googleapis` — Google Drive API
- `docusign-esign` — DocuSign API

## Erreur handling

- API routes : toujours retourner un JSON structuré `{ success, data, error }`
- Jamais de `catch` vide — logger l'erreur
- Erreurs utilisateur : messages en français, clairs
- Erreurs système : logger les détails techniques, afficher un message générique à l'utilisateur
- Erreurs DocuSign / Google Drive : toujours logger le code HTTP + le body de réponse pour debug
HEREDOC_CONVENTIONS_md

cat > "docs/DECISIONS.md" << 'HEREDOC_DECISIONS_md'
# Décisions techniques — Contract Engine

> Journal du "pourquoi" derrière chaque choix technique important.
> Avant de remettre en question un choix, lis d'abord pourquoi il a été fait.

---

## DEC-001 : Next.js App Router (pas Vite séparé)
**Date :** 2026-04-07
**Contexte :** La spec mentionne "React (Next.js ou Vite)". Il faut choisir.
**Décision :** Next.js 14 App Router — frontend et backend dans le même projet.
**Alternatives considérées :**
- Vite (frontend) + Express (backend) séparés → écarté parce que ça double les services Railway, la config, et la complexité de déploiement pour un projet interne simple
- Next.js Pages Router → écarté parce que App Router est le standard actuel et simplifie les API routes
**Conséquences :** Un seul service Railway. Les API routes sont dans `src/app/api/`. Le frontend et le backend partagent les types.

---

## DEC-002 : Prisma (pas Drizzle, pas SQL raw)
**Date :** 2026-04-07
**Contexte :** Besoin d'un ORM pour PostgreSQL avec migrations.
**Décision :** Prisma avec mapping snake_case via `@@map`.
**Alternatives considérées :**
- Drizzle → écarté parce que moins mature, tooling migration moins robuste
- SQL raw → écarté parce que trop de risques d'erreur et pas de typage
**Conséquences :** `prisma/schema.prisma` est la source de vérité du schéma. Migrations via `prisma migrate dev`. Le client est dans `src/lib/db.ts`.

---

## DEC-003 : Auth simple par token bearer (pas Supabase Auth, pas OAuth)
**Date :** 2026-04-07
**Contexte :** App interne utilisée par 1-2 opératrices. Pas besoin de multi-users complexe.
**Décision :** Un simple `APP_SECRET` en variable d'env, vérifié dans un middleware via header `Authorization: Bearer {token}`.
**Alternatives considérées :**
- Supabase Auth → écarté parce que overkill pour 1-2 utilisateurs internes
- Google OAuth → envisagé pour plus tard si besoin d'identifier qui fait quoi, mais pas pour la V1
**Conséquences :** Pas de table users. Le champ `pushed_by` dans versions est un identifiant simple (pas un FK).

---

## DEC-004 : Lib `docx` npm (pas Puppeteer, pas LibreOffice)
**Date :** 2026-04-07
**Contexte :** Besoin de générer des DOCX avec mise en page pixel-perfect.
**Décision :** Utiliser la librairie `docx` (npm) pour générer les DOCX en code pur.
**Alternatives considérées :**
- HTML → PDF via Puppeteer → écarté parce qu'on a besoin de DOCX (pas PDF) pour DocuSign, et la conversion HTML→DOCX est toujours moche
- Remplir un template DOCX existant → écarté parce que les templates Word sont fragiles et hard to maintain en code
- LibreOffice headless → écarté parce que lourd à déployer sur Railway
**Conséquences :** Les styles DOCX sont codés en dur dans `src/config/styles.ts`. Il faut extraire les styles exacts des contrats actuels avant de coder le générateur.

---

## DEC-005 : Google Drive comme stockage intermédiaire
**Date :** 2026-04-07
**Contexte :** DocuSign a besoin d'un document à mettre dans le template. L'équipe utilise déjà Google Drive pour les contrats.
**Décision :** Uploader les DOCX générés dans Google Drive (conversion auto en Google Doc), archiver les anciens dans un sous-dossier daté, et exporter en PDF pour la preview.
**Alternatives considérées :**
- Stockage local / S3 → écarté parce que l'équipe a besoin de voir les docs dans Drive et les modifications manuelles ponctuelles restent possibles
**Conséquences :** Service Account Google Cloud nécessaire. Les Google Doc IDs sont stockés dans la table `contracts`.

---

## DEC-006 : DocuSign JWT Grant (pas Authorization Code)
**Date :** 2026-04-07
**Contexte :** L'app est server-side, pas interactive côté DocuSign.
**Décision :** OAuth 2.0 JWT Grant pour l'auth DocuSign (app serveur, pas d'intervention utilisateur).
**Alternatives considérées :**
- Authorization Code Grant → écarté parce que nécessite une interaction utilisateur à chaque expiration du token
**Conséquences :** Clé RSA à stocker en variable d'env. Consentement initial à donner manuellement une fois. Instance EU (`eu.docusign.net`), pas US.

---

## DEC-007 : Pas de RLS (Row Level Security)
**Date :** 2026-04-07
**Contexte :** App interne, 1-2 utilisateurs, pas de multi-tenant.
**Décision :** Pas de RLS sur PostgreSQL. L'auth est gérée au niveau middleware.
**Alternatives considérées :**
- RLS comme sur les projets Supabase → écarté parce que pas de Supabase, pas de multi-users
**Conséquences :** Si un jour l'app devient multi-tenant, il faudra ajouter un `user_id` et du RLS.

---

> Ajouter une nouvelle entrée à chaque décision structurante.
HEREDOC_DECISIONS_md

cat > "docs/DEPENDENCIES.md" << 'HEREDOC_DEPENDENCIES_md'
# Carte des dépendances — Contract Engine

> **OBLIGATOIRE** : consulter ce fichier AVANT de modifier tout fichier source.
> Si tu modifies un fichier listé ici, tu DOIS vérifier tous les fichiers qui en dépendent.
> Si tu ajoutes un import ou supprimes un export, tu DOIS mettre à jour ce fichier.

## Comment lire ce fichier

Chaque entrée suit ce format :
- **Fichier** : le fichier source
- **Exporte** : ce qu'il expose (fonctions, composants, types, constantes)
- **Utilisé par** : les fichiers qui importent depuis celui-ci
- **Dépend de** : les fichiers depuis lesquels il importe

> ⚠️ Si un fichier a beaucoup de "Utilisé par", c'est un fichier critique.
> Le modifier peut casser beaucoup de choses. Procéder avec prudence.

---

## Fichiers critiques (modifier avec extrême prudence)

### `src/lib/db.ts`
- **Exporte :** `prisma` (client Prisma)
- **Utilisé par :** [À REMPLIR — tous les fichiers qui font des requêtes DB]
- **Dépend de :** `prisma/schema.prisma`
- **⚠️ Impact :** Fichier fondation. Ne JAMAIS modifier sans validation Loïc.

### `src/lib/contract-assembler.ts`
- **Exporte :** [À REMPLIR]
- **Utilisé par :** [À REMPLIR]
- **Dépend de :** [À REMPLIR]
- **⚠️ Impact :** Logique métier critique — si un article est mal assemblé, le contrat signé sera faux.

### `src/lib/docx-generator.ts`
- **Exporte :** [À REMPLIR]
- **Utilisé par :** [À REMPLIR]
- **Dépend de :** [À REMPLIR]
- **⚠️ Impact :** Mise en page des contrats. Toute modification doit être vérifiée visuellement sur les 18 variantes.

### `src/config/contracts.ts`
- **Exporte :** [À REMPLIR — mapping des 18 variantes, PowerForm IDs, etc.]
- **Utilisé par :** [À REMPLIR]
- **Dépend de :** rien
- **⚠️ Impact :** Source de vérité pour le mapping des 18 variantes. Erreur ici = mauvais contrat envoyé à DocuSign.

---

## Lib

### `src/lib/auth.ts`
- **Exporte :** [À REMPLIR]
- **Utilisé par :** [À REMPLIR]
- **Dépend de :** [À REMPLIR]

### `src/lib/google-drive.ts`
- **Exporte :** [À REMPLIR]
- **Utilisé par :** [À REMPLIR]
- **Dépend de :** [À REMPLIR]

### `src/lib/docusign.ts`
- **Exporte :** [À REMPLIR]
- **Utilisé par :** [À REMPLIR]
- **Dépend de :** [À REMPLIR]

---

## Config

### `src/config/styles.ts`
- **Exporte :** [À REMPLIR — styles DOCX]
- **Utilisé par :** [À REMPLIR]
- **Dépend de :** rien

---

## Composants

### `src/components/ArticleEditor.tsx`
- **Exporte :** [À REMPLIR]
- **Utilisé par :** [À REMPLIR]
- **Dépend de :** [À REMPLIR]

### `src/components/VariantTabs.tsx`
- **Exporte :** [À REMPLIR]
- **Utilisé par :** [À REMPLIR]
- **Dépend de :** [À REMPLIR]

### `src/components/ContractList.tsx`
- **Exporte :** [À REMPLIR]
- **Utilisé par :** [À REMPLIR]
- **Dépend de :** [À REMPLIR]

### `src/components/PreviewPanel.tsx`
- **Exporte :** [À REMPLIR]
- **Utilisé par :** [À REMPLIR]
- **Dépend de :** [À REMPLIR]

### `src/components/StepIndicator.tsx`
- **Exporte :** [À REMPLIR]
- **Utilisé par :** [À REMPLIR]
- **Dépend de :** [À REMPLIR]

---

## Types

### `src/types/index.ts`
- **Exporte :** [À REMPLIR]
- **Utilisé par :** [À REMPLIR]
- **Dépend de :** rien

---

## Routes API

### `src/app/api/articles/route.ts`
- **Exporte :** `GET`, `PUT`
- **Utilisé par :** frontend via fetch
- **Dépend de :** [À REMPLIR]

### `src/app/api/generate/route.ts`
- **Exporte :** `POST`
- **Utilisé par :** frontend via fetch
- **Dépend de :** [À REMPLIR]

### `src/app/api/push-docusign/route.ts`
- **Exporte :** `POST`
- **Utilisé par :** frontend via fetch
- **Dépend de :** [À REMPLIR]

### `src/app/api/versions/route.ts`
- **Exporte :** `GET`
- **Utilisé par :** frontend via fetch
- **Dépend de :** [À REMPLIR]

### `src/app/api/contracts/route.ts`
- **Exporte :** `GET`
- **Utilisé par :** frontend via fetch
- **Dépend de :** [À REMPLIR]

---

## Fichiers de config (ne pas toucher sans raison)

| Fichier | Rôle | Toucher = danger ? |
|---------|------|---------------------|
| `next.config.js` | Config Next.js | ⚠️ Oui |
| `tailwind.config.ts` | Config Tailwind | Modéré |
| `tsconfig.json` | Config TypeScript | ⚠️ Oui |
| `prisma/schema.prisma` | Schéma DB | ⚠️ Oui — toute modif = nouvelle migration |
| `.env.local` | Variables d'env locales | ⚠️ Oui |
| `railway.json` | Config déploiement | ⚠️ Oui |

---

> **Dernière mise à jour :** 2026-04-07
> **Mis à jour par :** [L'agent codeur remplit ce fichier après l'init technique]
HEREDOC_DEPENDENCIES_md

cat > "docs/BRIEF-INIT.md" << 'HEREDOC_BRIEF_INIT_md'
=== BRIEF INIT — CONTRACT ENGINE ===

Les fichiers CLAUDE.md et docs/ sont déjà dans le repo.
Suis ces étapes dans l'ordre. Ne saute aucune étape. Ne prends aucune initiative.

ÉTAPE 1 — Lis CLAUDE.md puis docs/ONBOARDING.md. Confirme que tu comprends le projet.

ÉTAPE 2 — Init technique :

```bash
# Init Next.js 14 avec App Router + TypeScript + Tailwind + ESLint
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm

# Prisma
npm install prisma @prisma/client
npx prisma init

# Lib DOCX (génération de documents Word)
npm install docx

# Google APIs (Drive)
npm install googleapis

# DocuSign (eSignature API)
npm install docusign-esign

# Dev dependencies
npm install -D @types/node
```

Après l'install :
- Remplacer le contenu de `prisma/schema.prisma` par le schéma complet documenté dans `docs/DATA-MODEL.md`
- Créer le fichier `.env.example` avec toutes les variables listées dans `docs/ONBOARDING.md` (valeurs vides)
- Créer la structure de dossiers :
  ```
  src/app/editor/page.tsx        (placeholder)
  src/app/generate/page.tsx      (placeholder)
  src/app/push/page.tsx          (placeholder)
  src/app/history/page.tsx       (placeholder)
  src/app/api/articles/route.ts  (placeholder)
  src/app/api/generate/route.ts  (placeholder)
  src/app/api/push-docusign/route.ts (placeholder)
  src/app/api/versions/route.ts  (placeholder)
  src/app/api/contracts/route.ts (placeholder)
  src/lib/db.ts                  (client Prisma)
  src/lib/auth.ts                (middleware auth token bearer)
  src/lib/docx-generator.ts      (placeholder)
  src/lib/contract-assembler.ts  (placeholder)
  src/lib/google-drive.ts        (placeholder)
  src/lib/docusign.ts            (placeholder)
  src/config/contracts.ts        (les 18 variantes avec codes, types, PowerForm IDs — depuis docs/DATA-MODEL.md et la spec)
  src/config/styles.ts           (placeholder — sera rempli après extraction des styles)
  src/types/index.ts             (types TypeScript)
  src/components/ArticleEditor.tsx  (placeholder)
  src/components/VariantTabs.tsx    (placeholder)
  src/components/ContractList.tsx   (placeholder)
  src/components/PreviewPanel.tsx   (placeholder)
  src/components/StepIndicator.tsx  (placeholder)
  scripts/seed-articles.ts       (placeholder)
  scripts/map-docusign-templates.ts (placeholder)
  scripts/extract-styles.ts      (placeholder)
  ```

- Pour `src/lib/db.ts` : exporter un singleton Prisma client (pattern standard Next.js)
- Pour `src/lib/auth.ts` : middleware qui vérifie `Authorization: Bearer {APP_SECRET}` — retourne 401 si invalide
- Pour `src/config/contracts.ts` : hardcoder les 18 variantes avec les données de la spec :
  - code, commission_type, statut_type, menage_type
  - google_doc_id (depuis la spec section 2)
  - docusign_powerform_id (depuis la spec section 2)
  - docusign_template_name (depuis la spec section 2)
- Les placeholders = fichier avec un commentaire expliquant ce que le fichier fera + les exports vides/mock

ÉTAPE 3 — Git + déploiement :
- `git init` + commit initial "chore: init projet Contract Engine"
- Push sur GitHub
- Créer branche `dev` depuis `main`
- Se placer sur `dev`
- Connecter Railway : 1 service PostgreSQL + 1 service Next.js
- Activer les preview deployments sur Railway
- Ajouter l'URL preview dans docs/CONVENTIONS.md

ÉTAPE 4 — Base de données :
- Copier `DATABASE_URL` depuis Railway dans `.env.local`
- `npx prisma migrate dev --name init` pour créer les tables
- Vérifier que les 3 tables (articles, contracts, versions) sont créées

ÉTAPE 5 — Seed des contrats :
- Créer un script `prisma/seed.ts` qui insère les 18 lignes dans la table `contracts`
  (utiliser les données hardcodées dans `src/config/contracts.ts`)
- Ajouter dans package.json : `"prisma": { "seed": "ts-node prisma/seed.ts" }`
- Exécuter : `npx prisma db seed`

ÉTAPE 6 — Remplis docs/DEPENDENCIES.md avec la carte des imports/exports de tous les fichiers créés.

ÉTAPE 7 — Vérification :
- `npm run build` passe
- `npm run dev` démarre sans erreur
- L'app affiche la page d'accueil Next.js par défaut
- La DB contient 18 lignes dans `contracts`
- Poste la checklist de livraison de docs/CONVENTIONS.md

=== FIN DU BRIEF ===
HEREDOC_BRIEF_INIT_md

cat > "CLAUDE.md" << 'HEREDOC_CLAUDE_md'
# Contract Engine

Lis `docs/ONBOARDING.md` pour comprendre ce projet.
Lis `docs/AGENT-RULES.md` pour connaître tes règles de fonctionnement.
Toute la documentation est dans `docs/` — Markdown standard, IA-agnostic.
Le code sans documentation mise à jour n'est PAS terminé.
HEREDOC_CLAUDE_md

echo "All docs/ files created"
ls -la docs/
