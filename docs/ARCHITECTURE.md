# Architecture -- Contract Engine

## Vue d'ensemble

```
[Operatrice -- Browser]
       |
       v
[Next.js App Router]  -->  [Middleware: cookie session (Web Crypto HMAC-SHA256)]
       |
       |-- /app/login/            -> Page de connexion (mot de passe unique)
       |-- /app/editor/           -> Editeur d'articles (CRUD)
       |-- /app/generate/         -> Generation des 18 DOCX + relecture + push
       |-- /app/push/             -> Resultats push DocuSign + liens PowerForms
       |-- /app/fix/              -> Correction unitaire (push un seul contrat)
       |-- /app/history/          -> Historique des versions (stub)
       |
       |-- /app/api/auth/login    -> POST login (mot de passe -> cookie session 90j)
       |-- /app/api/auth/logout   -> POST logout (supprime cookie)
       |-- /app/api/auth/check    -> GET verifie validite session
       |-- /app/api/articles/*    -> CRUD articles (PostgreSQL)
       |-- /app/api/contracts     -> Liste les 18 contrats avec mapping DocuSign
       |-- /app/api/generate      -> Assemblage + generation DOCX + upload Drive
       |-- /app/api/push-docusign -> DOCX->PDF LibreOffice + push DocuSign + upload PDF Drive
       |-- /app/api/push-docusign/single -> Push un seul contrat vers DocuSign
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
--- Connexion ---
Operatrice -> /login -> entre mot de passe
  -> POST /api/auth/login
  -> verifie LOGIN_PASSWORD
  -> pose cookie "session" = HMAC-SHA256(APP_SECRET, LOGIN_PASSWORD)
  -> cookie httpOnly, secure, sameSite strict, maxAge 90 jours
  -> redirect vers /editor

--- Middleware (pages frontend) ---
Requete page -> middleware.ts (Edge Runtime)
  -> lit cookie "session"
  -> calcule HMAC-SHA256 via Web Crypto API (crypto.subtle)
  -> si invalide : redirect vers /login
  -> si valide : NextResponse.next()

--- Routes API ---
Requete API -> authenticate() dans src/lib/auth.ts (Node.js runtime)
  -> Method 1 : header Authorization: Bearer {APP_SECRET}
  -> Method 2 : cookie "session" = HMAC-SHA256(APP_SECRET, LOGIN_PASSWORD) via Node.js crypto
  -> si aucune methode ne matche : 401

--- Session expiree en cours de travail ---
Appel API retourne 401 -> AuthProvider.apiCall() intercepte
  -> ReLoginModal s'affiche (overlay, pas de redirect, pas de perte de donnees)
  -> Operatrice re-entre le mot de passe -> POST /api/auth/login
  -> Requete echouee rejouee automatiquement
```

**Architecture auth :**
- `src/middleware.ts` -- Edge Runtime, utilise **Web Crypto API** (`crypto.subtle.importKey` + `crypto.subtle.sign`) car le module Node.js `crypto` n'est pas disponible en Edge Runtime
- `src/lib/auth.ts` -- Node.js runtime, utilise `createHmac` de Node.js `crypto`
- `src/components/AuthProvider.tsx` -- React context dans `layout.tsx`, wrape toute l'app, fournit `apiCall()` (wrapper de `fetch` qui intercepte les 401) et affiche le `ReLoginModal` si necessaire
- `src/components/ReLoginModal.tsx` -- overlay de reconnexion (formulaire mot de passe, message "Session expiree", "Votre travail est preserve")
- `src/components/LogoutButton.tsx` -- appelle `POST /api/auth/logout`, redirige vers `/login`

Auth simple : pas de multi-users, pas de roles. Un seul mot de passe partage par l'equipe.

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

### Flux correction unitaire (/fix -> POST /api/push-docusign/single)

```
1. CORRIGER (Page /fix)
   Operatrice -> selectionne un contrat dans la liste deroulante
   -> clique "Ouvrir dans Drive" -> ouvre le DOCX dans Google Docs
   -> corrige manuellement le document
   -> revient sur /fix -> clique "Pousser vers DocuSign"
   -> POST /api/push-docusign/single { contractCode: "P1.P.CJ" }

2. PUSH UNITAIRE (POST /api/push-docusign/single)
   a. Telecharge le DOCX depuis Drive (google_doc_id du contrat)
   b. Convertit en PDF via LibreOffice headless
   c. PUT le PDF dans le template DocuSign existant (remplace le document)
   d. Reactive le PowerForm (desactive automatiquement apres mise a jour du template)
   -> Pas de nouvelle version inseree (correction ponctuelle)
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
| PostgreSQL (Railway) | DB : articles (53), contracts (48 = 24 promesses + 24 contrats), versions | `DATABASE_URL` dans `.env.local` | `docs/DATA-MODEL.md` |
| Railway | Hebergement app + DB | Dashboard Railway, Dockerfile custom | railway.app |
| Google Drive API v3 | Upload DOCX natif (promesses + contrats), upload PDF, archivage, download | `GOOGLE_SERVICE_ACCOUNT_KEY`, `GOOGLE_DRIVE_ROOT_FOLDER_ID` (promesses), `GOOGLE_DRIVE_ARCHIVE_FOLDER_ID`, `GOOGLE_DRIVE_CONTRATS_FOLDER_ID` (contrats) | developers.google.com/drive |
| DocuSign eSignature API | Create/update templates, PowerForms, JWT auth | `DOCUSIGN_*` vars, instance EU | developers.docusign.com |
| LibreOffice headless | Conversion DOCX -> PDF dans Docker | Installe via Dockerfile | libreoffice.org |
| Prisma | ORM PostgreSQL | `prisma/schema.prisma` | prisma.io/docs |

## Flux de generation des contrats definitifs (Phase 2 contrat)

```
POST /api/generate-contrats (Bearer auth)
  ↓
prisma.contract.findMany({ where: { documentType: "contrat" } })   // 24 contrats C*
prisma.article.findMany()                                           // 53 articles
  ↓
archiveCurrentContratsFolder()              // dossier "(en cours)" → "archives contrats redigees"
createContratsOutputFolder(dateStr)         // nouveau dossier "MODELES CONTRATS - MAJ DU JJ/MM/AA (en cours)"
  ↓
pour chaque contrat C* :
  assembleContract(articles, contract, "contrat")
    ├── filtre (`all` + `contrat_only`)
    ├── selectContent(scope) — logique existante
    ├── computeSectionNumbers — numerotation dynamique 2.2.x / 2.4.x
    └── remap titres (CONTRAT_TITLE_REMAPPING + CONTRAT_SUBTITLE_REMAPPING)
  generateDocx(assembled, contract, "contrat")
    ├── currentDocumentType = "contrat" → anchorTab() retourne run vide (pas de /sn1/, /nm1/…)
    ├── applyDynamicNumbering → applyContratTextRemap (PROTECTED_REFERENCES sentinellees)
    ├── header MAJUSCULES pour codes de CONTRAT_TITLE_REMAPPING
    ├── annexe_mandat_sepa → image pleine page (public/images/mandat-sepa.jpg)
    ├── art_9 (commentaires) → skip pour contrat
    └── titre document : "PROMESSE DE CONTRAT" → "CONTRAT DE PRESTATIONS DE SERVICES" + "CONCIERGERIE - ACTE ITERATIF -"
  uploadContratDocx(folderId, code, buffer)
  prisma.contract.update({ data: { googleDocId } })
```

Aucune conversion PDF, aucun appel DocuSign. Le pipeline promesse (`POST /api/generate` + `POST /api/push-docusign`) est intact — le seul ajustement est `where: { documentType: 'promesse' }` dans `/api/generate` pour exclure les C* desormais presents en table.

## Decisions d'architecture

Voir `docs/DECISIONS.md` pour le journal des choix techniques et leurs justifications.

---

> **Derniere mise a jour :** 2026-04-15 (Phase 2 contrat : pipeline `assembler` + `generator` + route `generate-contrats`)
