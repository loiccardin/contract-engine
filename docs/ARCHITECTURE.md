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
