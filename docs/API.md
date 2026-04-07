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
