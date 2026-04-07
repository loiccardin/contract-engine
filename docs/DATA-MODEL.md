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
