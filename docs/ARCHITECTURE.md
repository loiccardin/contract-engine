# Architecture -- Contract Engine

## Vue d'ensemble

```
[Operatrice -- Browser]
       |
       v
[Next.js App Router]  -->  [Middleware: auth check (token bearer)]
       |
       |-- /app/editor/           -> Editeur d'articles (CRUD)
       |-- /app/generate/         -> Generation des 18 DOCX + relecture + push
       |-- /app/push/             -> Resultats push DocuSign + liens PowerForms
       |-- /app/history/          -> Historique des versions (stub)
       |
       |-- /app/api/articles/*    -> CRUD articles (PostgreSQL)
       |-- /app/api/contracts     -> Liste les 18 contrats avec mapping DocuSign
       |-- /app/api/generate      -> Assemblage + generation DOCX + upload Drive
       |-- /app/api/push-docusign -> DOCX->PDF LibreOffice + push DocuSign + upload PDF Drive
       |-- /app/api/versions      -> Historique des versions (stub)
       |-- /app/api/generate-test -> Un seul DOCX (temporaire)
       +-- /app/api/generate-test-all -> 18 DOCX en ZIP (temporaire)
                |
                v
       +--------------------+
       |   PostgreSQL        |  Tables : articles (41), contracts (18), versions
       |   (Railway)         |  Pas de RLS (app interne, auth par token)
       +--------------------+
                |
       +--------+-------------------------------+
       |                                        |
       v                                        v
+----------------+                    +------------------+
| Google Drive   |                    | DocuSign EU      |
| API v3         |                    | eSignature API   |
|                |                    |                  |
| - Upload DOCX  |                    | - JWT Grant auth |
|   (natif, pas  |                    | - Create/update  |
|   Google Doc)  |                    |   templates      |
| - Upload PDF   |                    | - Create         |
| - Download     |                    |   PowerForms     |
| - Archive      |                    | - Reactivate     |
| - Creer        |                    |   PowerForms     |
|   dossiers     |                    | - Anchor tabs    |
+----------------+                    +------------------+
       ^                                        ^
       |                                        |
       +------------+---------------------------+
                    |
            +-------+--------+
            | LibreOffice    |
            | headless       |
            | (Docker)       |
            |                |
            | DOCX -> PDF    |
            | timeout 30s    |
            +----------------+
```

## Flux de donnees principaux

### Authentification
```
Operatrice -> Login (token bearer) -> authenticate() verifie APP_SECRET -> Acces autorise
```
Auth simple : pas de multi-users, pas de roles. Un seul token partage par l'equipe.
Le token est stocke dans `localStorage` cote client.

### Flux principal : Modification -> Generation -> Push

```
1. MODIFIER (Etape 1 -- /editor)
   Operatrice -> Modifie article dans l'editeur (accordeon + onglets par variante)
   -> PUT /api/articles/:id -> UPDATE articles SET content_xxx WHERE id

2. GENERER (Etape 2 -- POST /api/generate)
   a. Archive les dossiers "(en cours)" existants dans Drive (deplace + renomme)
   b. Cree 2 dossiers dates : "MODELES PROMESSES" (DOCX) + "MODELES PROMESSES EN PDF" (PDF)
   c. Pour chaque contrat (x18) :
      - contract-assembler.ts selectionne les bons contenus selon (commission, statut, menage)
      - docx-generator.ts genere le DOCX (lib docx npm + injection header/footer XML)
      - google-drive.ts uploade le DOCX natif dans Drive (PAS de conversion Google Doc)
   d. Met a jour google_doc_id dans la table contracts
   -> L'operatrice verifie les DOCX dans Drive avant de continuer

3. POUSSER (Etape 2 suite -- POST /api/push-docusign, declenche depuis /generate)
   a. Pour chaque contrat (x18) :
      - google-drive.ts telecharge le DOCX depuis Drive
      - pdf-converter.ts convertit en PDF via LibreOffice headless (timeout 30s)
      - google-drive.ts uploade le PDF dans le dossier PDF de Drive
      - Si premiere fois : docusign.ts cree le template + PowerForm
      - Si mise a jour : docusign.ts remplace le document + reactive le PowerForm
   b. INSERT versions (numero incremental)
   -> Redirect vers /push qui affiche les liens PowerForm
```

### Diagramme du flux DOCX -> PDF -> DocuSign

```
Articles (DB)
     |
     v
[contract-assembler.ts]  -- selectionne contenus par scope
     |
     v
[docx-generator.ts]  -- genere DOCX avec lib docx + inject header/footer XML
     |
     v
DOCX Buffer
     |
     +-- Upload natif dans Drive --> Dossier DOCX "(en cours)"
     |                                   |
     |                            [Operatrice relit dans Drive]
     |                                   |
     +-- Download depuis Drive <---------+
     |
     v
[pdf-converter.ts]  -- LibreOffice headless (Docker)
     |
     v
PDF Buffer
     |
     +-- Upload dans Drive --> Dossier PDF "(en cours)"
     |
     +-- Push vers DocuSign --> Template (create ou update)
                                    |
                                    v
                               PowerForm (create ou reactivate)
                                    |
                                    v
                               URL PowerForm -> signataire
```

### Logique d'assemblage (contract-assembler.ts)

Pour un contrat donne (ex: P1.P.CJ = Classique + Particulier + Zones CJ) :

```
Pour chaque article trie par order_index :
  Si scope = 'common'     -> utiliser content_common
  Si scope = 'commission' -> utiliser content_classique (car P1 = Classique)
  Si scope = 'statut'     -> utiliser content_particulier (car .P = Particulier)
  Si scope = 'menage'     -> utiliser content_zones_cj (car .CJ = Zones CJ)
  Si le contenu selectionne est NULL -> article absent de cette variante (ex: section menage pour P2)
```

Numerotation dynamique : les sections 2.2.x et 2.4.x sont renumerotees automatiquement
quand des articles sont absents (ex: sans menage -> les numeros se decalent).

### Structure Google Drive

```
[Dossier racine] (GOOGLE_DRIVE_ROOT_FOLDER_ID)
|
|-- MODELES PROMESSES - MAJ DU 08/04/26 (en cours)     <- DOCX generes
|   |-- P1.P.CJ - Promesse contrat de conciergerie - ... .docx
|   |-- P1.P.R - Promesse contrat de conciergerie - ... .docx
|   +-- ... (18 fichiers DOCX)
|
|-- MODELES PROMESSES EN PDF - MAJ DU 08/04/26 (en cours)  <- PDF generes
|   |-- CE - P1.P.CJ.pdf
|   +-- ... (18 fichiers PDF)
|
[Dossier archive] (GOOGLE_DRIVE_ARCHIVE_FOLDER_ID)
|-- MODELES PROMESSES - MAJ DU 06/04/26                <- Anciens dossiers (sans "(en cours)")
|-- MODELES PROMESSES EN PDF - MAJ DU 06/04/26
+-- ...
```

### Dockerfile (deploiement Railway)

```dockerfile
FROM node:20-slim
- libreoffice-writer : conversion DOCX -> PDF
- fonts-liberation : polices de base
- fonts/HelveticaNeue.ttc : police custom (copie dans /usr/share/fonts/truetype/)
- fc-cache : regeneration du cache de polices
```

Le fichier `railway.json` pointe vers le Dockerfile. Le fichier `nixpacks.toml` est un fallback
qui installe `libreoffice-core` et `libreoffice-writer` via apt si Nixpacks est utilise a la place de Docker.

## Services externes

| Service | Usage | Config | Doc |
|---------|-------|--------|-----|
| PostgreSQL (Railway) | DB : articles (41), contracts (18), versions | `DATABASE_URL` dans `.env.local` | `docs/DATA-MODEL.md` |
| Railway | Hebergement app + DB | Dashboard Railway, Dockerfile custom | railway.app |
| Google Drive API v3 | Upload DOCX natif, upload PDF, archivage, download | `GOOGLE_SERVICE_ACCOUNT_KEY`, `GOOGLE_DRIVE_ROOT_FOLDER_ID`, `GOOGLE_DRIVE_ARCHIVE_FOLDER_ID` | developers.google.com/drive |
| DocuSign eSignature API | Create/update templates, PowerForms, JWT auth | `DOCUSIGN_*` vars, instance EU | developers.docusign.com |
| LibreOffice headless | Conversion DOCX -> PDF dans Docker | Installe via Dockerfile | libreoffice.org |
| Prisma | ORM PostgreSQL | `prisma/schema.prisma` | prisma.io/docs |

## Decisions d'architecture

Voir `docs/DECISIONS.md` pour le journal des choix techniques et leurs justifications.

---

> **Derniere mise a jour :** 2026-04-09
