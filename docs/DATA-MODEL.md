# Modele de donnees -- Contract Engine

> Schema complet de la base de donnees. Mettre a jour a CHAQUE migration.

## Vue d'ensemble des relations

```
articles (template maitre — 41 articles)
  |
  |  Pas de FK directe — la relation est logique :
  |  contract-assembler.ts selectionne le bon contenu
  |  de chaque article selon le type du contrat
  |
contracts (les 18 variantes)
  |
  |  Pas de FK vers articles — le mapping est par code/type
  |
versions (historique des pushs)
     |
     +-- Independante — log de chaque push DocuSign
```

## Tables

### `articles`
Stocke le contenu de chaque article/section du template maitre. Le scope determine quel champ `content_*` est utilise. Actuellement 41 articles.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | SERIAL | PK | Identifiant unique |
| `code` | VARCHAR(50) | NOT NULL, UNIQUE | Code unique de l'article. Ex: `art_1_1`, `art_2_4_1_intro`, `en_tete_titre`, `bloc_signature` |
| `title` | VARCHAR(255) | NOT NULL | Titre affiche. Ex: `Article 1.1 -- Objet du contrat` |
| `order_index` | INTEGER | NOT NULL | Ordre d'affichage dans le contrat |
| `scope` | VARCHAR(20) | NOT NULL, DEFAULT 'common' | Axe de variation : `common`, `commission`, `statut`, `menage` |
| `content_common` | TEXT | | Contenu si scope = `common` |
| `content_classique` | TEXT | | Variante Classique (P1/P2) si scope = `commission` |
| `content_studio` | TEXT | | Variante Studio (P3/P4) si scope = `commission` |
| `content_20pct` | TEXT | | Variante 20% (P5/P6) si scope = `commission` |
| `content_particulier` | TEXT | | Variante Particulier (.P) si scope = `statut` |
| `content_societe` | TEXT | | Variante Societe (.S) si scope = `statut` |
| `content_zones_cj` | TEXT | | Variante Zones Classiques & Jaunes (.CJ) si scope = `menage` |
| `content_zones_r` | TEXT | | Variante Zones Rouges (.R) si scope = `menage` |
| `content_sans_menage` | TEXT | | Variante Sans menage (P2/P4/P6). NULL = section absente de cette variante |
| `is_page_break_before` | BOOLEAN | DEFAULT FALSE | Saut de page force avant cet article |
| `keep_together` | BOOLEAN | DEFAULT TRUE | Ne jamais couper cet article entre 2 pages |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Derniere modification (auto-update par Prisma @updatedAt) |

**Logique de scope :**
- `common` -> meme contenu pour les 18 -> lire `content_common`
- `commission` -> varie selon le type de commission -> lire `content_classique` OU `content_studio` OU `content_20pct`
- `statut` -> varie selon le statut juridique -> lire `content_particulier` OU `content_societe`
- `menage` -> varie selon le type de menage -> lire `content_zones_cj` OU `content_zones_r` OU `content_sans_menage`

**Les 41 articles (par order_index) :**
`en_tete_titre`, `en_tete_proprietaire`, `en_tete_prestataire`, `preambule`, `art_1_1`, `art_1_2`, `art_1_3`, `art_1_4`, `art_2_1`, `art_2_2_intro`, `art_2_2_1_menage`, `art_2_2_2_linge`, `art_2_2_decoration`, `art_2_2_photos`, `art_2_2_annonces`, `art_2_2_accueil`, `art_2_2_communication`, `art_2_2_revenue`, `art_2_3`, `art_2_4_1_intro`, `art_2_4_1_taux`, `art_2_4_2_frais_menage`, `art_2_4_deplacements`, `art_2_4_frais_divers`, `art_2_5`, `art_2_6`, `art_2_7`, `art_2_8`, `art_2_9`, `art_2_10`, `art_3_1`, `art_3_2`, `art_4`, `art_5`, `art_6`, `art_7`, `art_8`, `art_9`, `bloc_signature`, `annexe_1`, `annexe_2`

**Index :**
- `code` UNIQUE (implicite via contrainte Prisma @unique)
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
| `google_doc_id` | VARCHAR(100) | | ID du fichier DOCX dans Drive (mis a jour apres chaque generation) |
| `docusign_template_name` | VARCHAR(255) | | Nom du template DocuSign (format: `CE - P1.P.CJ`) |
| `docusign_powerform_id` | VARCHAR(100) | | ID du PowerForm (cree lors du premier push) |
| `docusign_template_id` | VARCHAR(100) | | ID du template DocuSign (cree lors du premier push) |

**Index :**
- `code` UNIQUE (implicite via contrainte Prisma @unique)

**Donnees initiales :** Les 18 lignes sont seedees au setup via `prisma/seed.ts` avec les codes et types. Les `docusign_template_id` et `docusign_powerform_id` sont remplis lors du premier push DocuSign.

---

### `versions`
Historique de chaque push vers DocuSign.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | SERIAL | PK | Identifiant unique |
| `version_number` | INTEGER | NOT NULL | Numero incremental |
| `description` | TEXT | | Description du changement (optionnel, actuellement non rempli par le code) |
| `archive_drive_folder_id` | VARCHAR(100) | | ID du dossier d'archive dans Google Drive (optionnel, actuellement non rempli) |
| `pushed_at` | TIMESTAMP | DEFAULT NOW() | Date du push |
| `pushed_by` | VARCHAR(100) | | Qui a pousse (valeur fixe: `contract-engine`) |

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

Les migrations sont gerees par Prisma (`prisma/migrations/`).
Ne JAMAIS modifier une migration existante -- creer une nouvelle migration pour corriger.

| Migration | Date | Description |
|-----------|------|-------------|
| `20260407135409_init` | 2026-04-07 | Tables initiales : articles, contracts, versions |

---

> **Derniere mise a jour :** 2026-04-09
