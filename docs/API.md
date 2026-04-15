# API -- Contract Engine

> Tous les endpoints REST du projet. Mettre a jour a CHAQUE ajout/modification de route.

## Base URL

- **Local :** `http://localhost:3000/api`
- **Preview :** [URL Railway dev]/api
- **Production :** https://contract-engine-app-production.up.railway.app/api

## Authentification

Les routes API acceptent **deux methodes** d'authentification (l'une ou l'autre suffit) :
1. **Bearer token** : header `Authorization: Bearer {APP_SECRET}` (machine-to-machine, scripts, appels externes)
2. **Cookie session** : cookie `session` pose par `POST /api/auth/login` (frontend, operatrice connectee)

Reponse si non authentifie : `401 { success: false, error: "Non authentifie" }`

Exception : `GET /api/versions` n'a pas d'auth (stub). Les routes `/api/auth/*` sont publiques.

## Format de reponse standard

```json
// Succes
{ "success": true, "data": { ... } }

// Erreur
{ "success": false, "error": "Message d'erreur lisible" }
```

---

## Endpoints

### Authentification

#### `POST /api/auth/login`
**Description :** Connexion par mot de passe unique. Pose un cookie session HMAC-SHA256.
**Auth :** Aucune (route publique)
**Body :**
```json
{ "password": "string" }
```

**Traitement :**
1. Verifie que `LOGIN_PASSWORD` et `APP_SECRET` sont configures
2. Compare le mot de passe recu avec `LOGIN_PASSWORD`
3. Si OK : calcule `HMAC-SHA256(APP_SECRET, LOGIN_PASSWORD)` et pose le cookie `session` (httpOnly, secure, sameSite strict, maxAge 90 jours)

**Reponse 200 :** `{ "success": true }` + cookie `session`
**Reponse 401 :** `{ "success": false, "error": "Mot de passe incorrect" }`
**Reponse 500 :** `{ "success": false, "error": "Configuration serveur manquante" }`

#### `POST /api/auth/logout`
**Description :** Deconnexion. Supprime le cookie session (maxAge: 0).
**Auth :** Aucune (route publique)
**Body :** aucun

**Reponse 200 :** `{ "success": true }` + cookie `session` vide

#### `GET /api/auth/check`
**Description :** Verifie la validite du cookie session courant.
**Auth :** Aucune (route publique)

**Reponse 200 :** `{ "success": true }` si le cookie est valide ou si l'auth n'est pas configuree
**Reponse 401 :** `{ "success": false }` si le cookie est absent ou invalide

---

### Articles

#### `GET /api/articles`
**Description :** Liste tous les articles du template maitre, tries par `order_index`
**Auth :** Requise

**Reponse 200 :**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "code": "art_1_1",
      "title": "Article 1.1 -- ...",
      "orderIndex": 10,
      "scope": "common",
      "contentCommon": "Le present contrat...",
      "contentClassique": null,
      "contentStudio": null,
      "content20pct": null,
      "contentParticulier": null,
      "contentSociete": null,
      "contentZonesCj": null,
      "contentZonesR": null,
      "contentSansMenage": null,
      "isPageBreakBefore": false,
      "keepTogether": true,
      "updatedAt": "2026-04-07T10:00:00Z"
    }
  ]
}
```

#### `GET /api/articles/:id`
**Description :** Recupere un article par son ID
**Auth :** Requise

**Reponse 200 :**
```json
{ "success": true, "data": { "id": 1, "code": "art_1_1", ... } }
```

**Reponse 400 :** `{ "success": false, "error": "ID invalide" }`
**Reponse 404 :** `{ "success": false, "error": "Article non trouve" }`

#### `PUT /api/articles/:id`
**Description :** Met a jour le contenu d'un article (mise a jour partielle)
**Auth :** Requise
**Body :**
```json
{
  "title": "string (optionnel)",
  "contentCommon": "string (optionnel)",
  "contentClassique": "string (optionnel)",
  "contentStudio": "string (optionnel)",
  "content20pct": "string (optionnel)",
  "contentParticulier": "string (optionnel)",
  "contentSociete": "string (optionnel)",
  "contentZonesCj": "string (optionnel)",
  "contentZonesR": "string (optionnel)",
  "contentSansMenage": "string | null (optionnel)",
  "isPageBreakBefore": "boolean (optionnel)",
  "keepTogether": "boolean (optionnel)"
}
```
> Seuls les champs envoyes sont mis a jour (champs dans UPDATABLE_FIELDS). Les autres restent inchanges.

**Reponse 200 :**
```json
{ "success": true, "data": { "id": 1, "code": "art_1_1", ... , "updatedAt": "..." } }
```

**Reponse 400 :** `{ "success": false, "error": "Aucun champ a mettre a jour" }`
**Reponse 404 :** `{ "success": false, "error": "Article non trouve" }`

---

### Generation

#### `POST /api/generate`
**Description :** Genere les 18 DOCX et les uploade dans Google Drive (DOCX natif, pas de conversion Google Doc)
**Auth :** Requise
**Body :** aucun

**Traitement :**
1. Recupere tous les articles (tries par order_index) et les 18 contrats
2. Archive les dossiers "(en cours)" existants dans Drive (deplace vers archive, renomme)
3. Cree 2 nouveaux dossiers dates dans Drive : un pour DOCX, un pour PDF
4. Pour chaque contrat (x18) : assemble articles -> genere DOCX -> uploade DOCX natif dans Drive
5. Met a jour `google_doc_id` dans la table contracts avec l'ID du fichier Drive
6. Retourne la liste des 18 avec statuts + liens Drive

**Reponse 200 :**
```json
{
  "success": true,
  "data": {
    "generatedAt": "2026-04-07T12:00:00Z",
    "archived": ["MODELES PROMESSES - MAJ DU 06/04/26"],
    "docsFolderId": "...",
    "contracts": [
      {
        "code": "P1.P.CJ",
        "status": "ok",
        "googleDocUrl": "https://drive.google.com/file/d/.../view",
        "articleCount": 25
      }
    ],
    "errors": []
  }
}
```

> Note : Pas de PDF a cette etape. Les PDF sont generes par `/api/push-docusign`.

> **Filtre `document_type='promesse'`** depuis l'ajout des contrats definitifs (Phase 1 contrat). Genere uniquement les 24 promesses P*. Les contrats C* sont generes par `POST /api/generate-contrats`.

---

#### `POST /api/generate-contrats`
**Description :** Genere les 24 contrats definitifs (C1-C8) en DOCX et les uploade dans le dossier Drive `GOOGLE_DRIVE_CONTRATS_ROOT_FOLDER_ID`. Pas de PDF, pas de DocuSign, pas de PowerForm.
**Auth :** Requise
**Body :** aucun

**Traitement :**
1. Recupere tous les articles (tries par order_index) et les 24 contrats `WHERE document_type = 'contrat'`
2. Archive l'eventuel dossier "(en cours)" precedent dans `GOOGLE_DRIVE_CONTRATS_ROOT_FOLDER_ID` : retire " (en cours)" du nom et deplace dans `GOOGLE_DRIVE_ARCHIVE_FOLDER_ID` (dossier partagé avec les promesses)
3. Cree un nouveau dossier `MODELES CONTRATS - MAJ DU JJ/MM/AA (en cours)`
4. Pour chaque contrat (x24) : `assembleContract(..., "contrat")` -> `generateDocx(..., "contrat")` -> upload DOCX natif (nom = code, ex `C1.P.CJ.docx`)
5. Met a jour `google_doc_id` dans la table contracts

**Reponse 200 :**
```json
{
  "success": true,
  "data": {
    "generated_at": "2026-04-15T...",
    "folder_id": "...",
    "folder_url": "https://drive.google.com/drive/folders/...",
    "archived": ["MODELES CONTRATS - MAJ DU 14/04/26"],
    "contracts": [
      { "code": "C1.P.CJ", "status": "ok", "drive_file_id": "...", "drive_file_url": "...", "article_count": 40 }
    ],
    "errors": []
  }
}
```

> Le pipeline `assembleContract` filtre les articles selon `document_type`, applique `CONTRAT_TITLE_REMAPPING` + `CONTRAT_SUBTITLE_REMAPPING` aux titres. Le pipeline `generateDocx` applique `CONTRAT_TEXT_REMAPPING` au contenu (apres la numerotation dynamique), respecte `PROTECTED_REFERENCES`, supprime les anchor tabs DocuSign, change le titre en "CONTRAT DE PRESTATIONS DE SERVICES / CONCIERGERIE - ACTE ITERATIF -", et insere l'image `public/images/mandat-sepa.jpg` en pleine page pour `annexe_mandat_sepa`.

---

### Push DocuSign

#### `POST /api/push-docusign`
**Description :** Telecharge les DOCX depuis Drive, les convertit en PDF via LibreOffice headless, uploade les PDF dans Drive, et pousse dans DocuSign (creation ou mise a jour templates + PowerForms)
**Auth :** Requise
**Body :** `{}` (objet vide)

**Traitement :**
1. Recupere les 18 contrats et obtient un token DocuSign JWT
2. Trouve le dossier PDF "(en cours)" dans Drive
3. Pour chaque contrat (x18) :
   a. Telecharge le DOCX depuis Drive (`google_doc_id`)
   b. Convertit en PDF via LibreOffice headless (`convertDocxToPdf`)
   c. Uploade le PDF dans le dossier PDF de Drive
   d. Si pas de `docusign_template_id` : cree le template DocuSign + cree le PowerForm, met a jour la DB
   e. Si `docusign_template_id` existe : remplace le document dans le template + reactive le PowerForm
4. Insere une version dans la table `versions` (numero incremental)

**Reponse 200 :**
```json
{
  "success": true,
  "data": {
    "version_number": 1,
    "pushed_at": "2026-04-07T14:00:00Z",
    "results": [
      { "code": "P1.P.CJ", "status": "ok", "powerform_url": "https://powerforms.docusign.net/...", "is_new": true },
      { "code": "P1.P.R", "status": "ok", "powerform_url": "https://powerforms.docusign.net/...", "is_new": false }
    ],
    "errors": []
  }
}
```

**Detail template DocuSign :** Chaque template contient :
- Un signer "PROPRIETAIRE" avec text tabs (anchor tabs : /nm1/, /ad1/, /dn1/, /py1/, /tl1/, /ml1/, /lg1/, /lg2/, /cm1/, /vi1/, /sr1/ pour .S)
- Un signHere tab ancre sur /sn1/
- Des initialHere tabs (paraphes) sur chaque page, positionnes par coordonnees fixes
- Un carbonCopy "LETAHOST LLC" pour recevoir une copie
- Un tab "bon_pour_accord" et un tab "date_signature" ancres dans le texte

---

### Push DocuSign unitaire

#### `POST /api/push-docusign/single`
**Description :** Telecharge un seul DOCX depuis Drive, le convertit en PDF, et met a jour le template DocuSign existant. Reactive le PowerForm.
**Auth :** Requise (bearer token ou cookie session)
**Body :**
```json
{ "contractCode": "P1.P.CJ" }
```

**Traitement :**
1. Verifie que le contrat existe en DB avec `googleDocId` et `docusignTemplateId`
2. Telecharge le DOCX depuis Drive (peut avoir ete modifie manuellement dans Google Docs)
3. Convertit en PDF via LibreOffice headless
4. PUT le PDF dans le template DocuSign (remplace le document existant, documentid=1)
5. Reactive le PowerForm si `docusignPowerformId` existe

**Reponse 200 :**
```json
{
  "success": true,
  "data": {
    "code": "P1.P.CJ",
    "status": "ok",
    "template_id": "..."
  }
}
```

**Reponse 400 :** `{ "success": false, "error": "contractCode requis" }` ou `"Pas de google_doc_id"` ou `"Pas de template DocuSign"`
**Reponse 404 :** `{ "success": false, "error": "Contrat 'XXX' non trouve" }`

---

### Contrats (referentiel)

#### `GET /api/contracts`
**Description :** Liste les 18 variantes avec leur mapping DocuSign et Google Drive
**Auth :** Requise

**Reponse 200 :**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "code": "P1.P.CJ",
      "commissionType": "classique",
      "statutType": "particulier",
      "menageType": "zones_cj",
      "googleDocId": "...",
      "docusignTemplateName": "CE - P1.P.CJ",
      "docusignPowerformId": "...",
      "docusignTemplateId": "..."
    }
  ]
}
```

---

### Versions (historique)

#### `GET /api/versions`
**Description :** Stub -- retourne un tableau vide (non implemente)
**Auth :** Aucune (pas d'appel a authenticate)

**Reponse 200 :**
```json
{ "success": true, "data": [] }
```

> Note : La creation des versions est faite par `/api/push-docusign`. La lecture est un stub.

---

### Routes temporaires (dev/test)

#### `POST /api/generate-test`
**Description :** Genere un seul DOCX pour un code contrat donne et le retourne en telechargement direct
**Auth :** Requise
**Body :**
```json
{ "code": "P1.P.CJ" }
```

**Reponse 200 :** Fichier DOCX binaire (`Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document`)
**Reponse 400 :** `{ "success": false, "error": "Le champ 'code' est requis (ex: P1.P.CJ)" }`
**Reponse 404 :** `{ "success": false, "error": "Contrat 'XXX' non trouve" }`

#### `POST /api/generate-test-all`
**Description :** Genere les 18 DOCX et les retourne dans un fichier ZIP
**Auth :** Requise
**Body :** aucun

**Reponse 200 :** Fichier ZIP binaire (`Content-Type: application/zip`, filename: `contrats-YYYY-MM-DD.zip`)

---

> **Derniere mise a jour :** 2026-04-15 (Phase 2 contrat : ajout `POST /api/generate-contrats`)
