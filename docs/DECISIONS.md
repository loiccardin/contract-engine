# Decisions techniques -- Contract Engine

> Journal du "pourquoi" derriere chaque choix technique important.
> Avant de remettre en question un choix, lis d'abord pourquoi il a ete fait.

---

## DEC-001 : Next.js App Router (pas Vite separe)
**Date :** 2026-04-07
**Contexte :** La spec mentionne "React (Next.js ou Vite)". Il faut choisir.
**Decision :** Next.js 14 App Router -- frontend et backend dans le meme projet.
**Alternatives considerees :**
- Vite (frontend) + Express (backend) separes -> ecarte parce que ca double les services Railway, la config, et la complexite de deploiement pour un projet interne simple
- Next.js Pages Router -> ecarte parce que App Router est le standard actuel et simplifie les API routes
**Consequences :** Un seul service Railway. Les API routes sont dans `src/app/api/`. Le frontend et le backend partagent les types.

---

## DEC-002 : Prisma (pas Drizzle, pas SQL raw)
**Date :** 2026-04-07
**Contexte :** Besoin d'un ORM pour PostgreSQL avec migrations.
**Decision :** Prisma avec mapping snake_case via `@@map`.
**Alternatives considerees :**
- Drizzle -> ecarte parce que moins mature, tooling migration moins robuste
- SQL raw -> ecarte parce que trop de risques d'erreur et pas de typage
**Consequences :** `prisma/schema.prisma` est la source de verite du schema. Migrations via `prisma migrate dev`. Le client est dans `src/lib/db.ts`.

---

## DEC-003 : Auth simple par token bearer (pas Supabase Auth, pas OAuth)
**Date :** 2026-04-07
**Contexte :** App interne utilisee par 1-2 operatrices. Pas besoin de multi-users complexe.
**Decision :** Un simple `APP_SECRET` en variable d'env, verifie dans un middleware via header `Authorization: Bearer {token}`.
**Alternatives considerees :**
- Supabase Auth -> ecarte parce que overkill pour 1-2 utilisateurs internes
- Google OAuth -> envisage pour plus tard si besoin d'identifier qui fait quoi, mais pas pour la V1
**Consequences :** Pas de table users. Le champ `pushed_by` dans versions est un identifiant simple (pas un FK). Le token est stocke dans localStorage cote client.

---

## DEC-004 : Lib `docx` npm (pas Puppeteer, pas LibreOffice)
**Date :** 2026-04-07
**Contexte :** Besoin de generer des DOCX avec mise en page pixel-perfect.
**Decision :** Utiliser la librairie `docx` (npm) pour generer les DOCX en code pur.
**Alternatives considerees :**
- HTML -> PDF via Puppeteer -> ecarte parce qu'on a besoin de DOCX (pas PDF) pour DocuSign, et la conversion HTML->DOCX est toujours moche
- Remplir un template DOCX existant -> ecarte parce que les templates Word sont fragiles et hard to maintain en code
- LibreOffice headless -> ecarte pour la generation (mais utilise pour la conversion PDF, voir DEC-009)
**Consequences :** Les styles DOCX sont codes en dur dans `src/config/styles.ts`. Police Helvetica Neue, 10pt, A4, marges 4.75cm/2.54cm. Header/footer injectes via post-processing ZIP (fichiers XML dans `src/templates/`).

---

## DEC-005 : Google Drive comme stockage intermediaire
**Date :** 2026-04-07
**Contexte :** DocuSign a besoin d'un document a mettre dans le template. L'equipe utilise deja Google Drive pour les contrats.
**Decision :** Uploader les DOCX generes dans Google Drive, archiver les anciens dans un dossier d'archives, et permettre la relecture avant le push DocuSign.
**Alternatives considerees :**
- Stockage local / S3 -> ecarte parce que l'equipe a besoin de voir les docs dans Drive et les modifications manuelles ponctuelles restent possibles
**Consequences :** Service Account Google Cloud necessaire. Les fichiers DOCX sont uploades dans un Shared Drive. Les IDs des fichiers sont stockes dans `google_doc_id` dans la table `contracts`.

---

## DEC-006 : DocuSign JWT Grant (pas Authorization Code)
**Date :** 2026-04-07
**Contexte :** L'app est server-side, pas interactive cote DocuSign.
**Decision :** OAuth 2.0 JWT Grant pour l'auth DocuSign (app serveur, pas d'intervention utilisateur).
**Alternatives considerees :**
- Authorization Code Grant -> ecarte parce que necessite une interaction utilisateur a chaque expiration du token
**Consequences :** Cle RSA a stocker en variable d'env. Consentement initial a donner manuellement une fois. Instance EU (`account.docusign.com` pour auth, `eu.docusign.net` pour API). Token cache en memoire avec renouvellement automatique (marge 5min).

---

## DEC-007 : Pas de RLS (Row Level Security)
**Date :** 2026-04-07
**Contexte :** App interne, 1-2 utilisateurs, pas de multi-tenant.
**Decision :** Pas de RLS sur PostgreSQL. L'auth est geree au niveau middleware.
**Alternatives considerees :**
- RLS comme sur les projets Supabase -> ecarte parce que pas de Supabase, pas de multi-users
**Consequences :** Si un jour l'app devient multi-tenant, il faudra ajouter un `user_id` et du RLS.

---

## DEC-008 : DOCX uploade natif dans Drive (pas de conversion Google Doc)
**Date :** 2026-04-08
**Contexte :** L'upload initial convertissait les DOCX en Google Docs (`mimeType: application/vnd.google-apps.document`), mais la conversion Google cassait les tableaux (annexe 2), les en-tetes/pieds de page custom, et certaines mises en forme.
**Decision :** Uploader les DOCX tel quel dans Drive, sans conversion en Google Doc.
**Alternatives considerees :**
- Conversion Google Doc -> ecarte apres tests : les tableaux etaient deformes, le header/footer perdu, et les polices substituees
**Consequences :** Les fichiers dans Drive s'ouvrent dans le viewer DOCX de Google Drive (lecture seule par defaut). L'operatrice peut cliquer "Ouvrir dans Google Docs" si elle veut modifier, mais la mise en page peut differer. Le champ `google_doc_id` dans la DB stocke l'ID du fichier DOCX (pas un Google Doc).

---

## DEC-009 : LibreOffice headless dans Docker pour la conversion PDF
**Date :** 2026-04-08
**Contexte :** DocuSign a besoin de recevoir un PDF (pas un DOCX) pour un rendu fiable des anchor tabs et de la mise en page. Il faut convertir les DOCX en PDF cote serveur.
**Decision :** LibreOffice headless (`libreoffice --headless --convert-to pdf`) execute via `execSync` avec timeout de 30 secondes.
**Alternatives considerees :**
- Google Drive export PDF -> ecarte car les DOCX ne sont plus convertis en Google Docs (voir DEC-008)
- API de conversion tierce (CloudConvert, etc.) -> ecarte pour eviter une dependance externe supplementaire et des couts
- Puppeteer HTML->PDF -> ecarte car on part du DOCX, pas du HTML
**Consequences :** Le Dockerfile doit installer `libreoffice-writer` et la police `Helvetica Neue`. Fichiers temporaires dans `/tmp`. Detection automatique du binaire (macOS: `/Applications/LibreOffice.app/Contents/MacOS/soffice`, Linux: `libreoffice`).

---

## DEC-010 : PDF pousse vers DocuSign (pas DOCX)
**Date :** 2026-04-08
**Contexte :** Les anchor tabs DocuSign ne se positionnaient pas correctement avec un DOCX (texte blanc invisible mal interprete, mises en page decalees).
**Decision :** Pousser le PDF (converti via LibreOffice) vers DocuSign plutot que le DOCX.
**Alternatives considerees :**
- Push DOCX directement -> ecarte apres tests : les anchor tabs ne matchaient pas, les polices etaient substituees, la pagination different
**Consequences :** Le flux est : DOCX -> LibreOffice PDF -> DocuSign. Le PDF est aussi uploade dans Drive pour archivage.

---

## DEC-011 : Anchor tabs en texte blanc invisible dans le DOCX
**Date :** 2026-04-08
**Contexte :** DocuSign utilise des "anchor strings" pour positionner les champs de signature et de saisie. Il faut placer ces ancres dans le document.
**Decision :** Inserer des TextRun avec du texte blanc (couleur `FFFFFF`) en taille 1pt (size: 2 half-points) dans le DOCX. Exemples : `/sn1/` (signature), `/dt1/` (date), `/nm1/` (nom), `/lg1/` (logement), `/cm1/` (commentaires), etc.
**Alternatives considerees :**
- Champs de formulaire DOCX -> ecarte car DocuSign ne les interprete pas
- Coordonnees fixes (xPosition/yPosition) -> utilise pour les paraphes (initialHere) car un par page, mais pas viable pour les champs texte dont la position varie selon la longueur du contrat
**Consequences :** Les anchor tabs sont definis a 2 endroits : dans `docx-generator.ts` (placement du texte invisible) et dans `push-docusign/route.ts` (configuration des tabs DocuSign avec offsets). Les paraphes (initialHere) utilisent des coordonnees fixes car ils sont places a la meme position sur chaque page.

---

## DEC-012 : PowerForms signingMode "direct"
**Date :** 2026-04-08
**Contexte :** Les PowerForms peuvent fonctionner en mode "email" (le signataire recoit un email) ou "direct" (le signataire remplit directement via le lien).
**Decision :** Mode `direct` -- le proprietaire remplit et signe directement via le lien PowerForm sans passer par un email.
**Alternatives considerees :**
- Mode email -> ecarte car le proprietaire doit pouvoir signer immediatement quand il recoit le lien
**Consequences :** L'URL PowerForm est de la forme `https://powerforms.docusign.net/{powerFormId}?env=eu&acct={accountId}&v=2`. Le proprietaire entre son nom et email sur la page PowerForm avant d'acceder au document. Une copie est envoyee a `direction@conciergerie-letahost.com` via carbonCopy.

---

## DEC-013 : Dockerfile custom avec Helvetica Neue
**Date :** 2026-04-08
**Contexte :** Les contrats Letahost utilisent la police Helvetica Neue. LibreOffice doit avoir cette police pour generer un PDF fidele.
**Decision :** Dockerfile base sur `node:20-slim` avec installation de `libreoffice-writer`, `fonts-liberation`, et copie du fichier `fonts/HelveticaNeue.ttc` dans `/usr/share/fonts/truetype/` suivie de `fc-cache -f -v`.
**Alternatives considerees :**
- Utiliser une police systeme (Arial, Liberation Sans) -> ecarte car le rendu serait different des contrats actuels
- Nixpacks sans Dockerfile -> le fichier `nixpacks.toml` existe en fallback mais ne gere pas l'installation de la police custom
**Consequences :** Le fichier `fonts/HelveticaNeue.ttc` doit etre present dans le repo. `railway.json` pointe vers le Dockerfile pour forcer son utilisation sur Railway.

---

## DEC-014 : Auth par mot de passe unique + cookie HMAC (pas OAuth, pas table users)
**Date :** 2026-04-09
**Contexte :** L'app interne utilisee par 1-2 operatrices a besoin d'une protection d'acces en production, mais pas d'un systeme multi-utilisateurs.
**Decision :** Un mot de passe unique (`LOGIN_PASSWORD` en variable d'env), verifie cote serveur. Le cookie session est un HMAC-SHA256 du mot de passe signe avec `APP_SECRET`. Duree 90 jours.
**Alternatives considerees :**
- OAuth Google -> ecarte car overkill, necessite un domaine autorise, et l'operatrice n'a pas forcement un compte Google du bon domaine
- Table users + hash bcrypt -> ecarte car 1-2 utilisateurs, pas besoin de comptes individuels
- Basic Auth HTTP -> ecarte car pas de session persistante, le navigateur redemande le mot de passe a chaque redemarrage
**Consequences :** Pas de table users. Le mot de passe est partage par l'equipe. Si le mot de passe change, toutes les sessions existantes sont invalidees (car le HMAC change). Le `LOGIN_PASSWORD` doit etre ajoute aux variables d'env sur Railway.

---

## DEC-015 : Web Crypto API dans le middleware (Edge Runtime)
**Date :** 2026-04-09
**Contexte :** Le middleware Next.js s'execute en Edge Runtime, qui ne donne pas acces au module Node.js `crypto`. Mais l'auth cookie necessite un HMAC-SHA256.
**Decision :** Utiliser l'API Web Crypto (`crypto.subtle.importKey` + `crypto.subtle.sign`) dans `src/middleware.ts`. Garder Node.js `crypto` (`createHmac`) dans `src/lib/auth.ts` (route API, Node.js runtime).
**Alternatives considerees :**
- Forcer le middleware en Node.js runtime -> ecarte car Next.js Edge middleware est plus performant et deploye au edge sur les plateformes compatibles
- Librairie tierce compatible Edge -> ecarte car Web Crypto est natif et standard
**Consequences :** Deux implementations du meme calcul HMAC-SHA256 : une via Web Crypto (middleware), une via Node.js crypto (routes API). Le resultat est identique (meme hex output). Attention a garder les deux en sync si la logique de hash change.

---

## DEC-016 : Page /fix pour correction unitaire sans regeneration
**Date :** 2026-04-09
**Contexte :** Parfois l'operatrice doit corriger une coquille dans un seul contrat sans regenerer les 18. Le workflow complet (editor -> generate -> push) est disproportionne pour une correction mineure.
**Decision :** Page `/fix` qui permet de selectionner un contrat, l'ouvrir dans Google Docs pour correction manuelle, puis pousser uniquement ce contrat vers DocuSign via `POST /api/push-docusign/single`.
**Alternatives considerees :**
- Regenerer les 18 meme pour une correction -> ecarte car trop lent et risque de perdre des corrections manuelles sur d'autres contrats
- Editer directement dans DocuSign -> ecarte car les anchor tabs seraient perdus et la mise en page corrompue
**Consequences :** L'endpoint `/api/push-docusign/single` telecharge le DOCX depuis Drive (qui peut avoir ete modifie manuellement dans Google Docs), le convertit en PDF, et met a jour le template DocuSign existant. Le PowerForm est reactive. Pas de nouvelle version inseree (correction ponctuelle, pas de regeneration complete).

---

## DEC-017 : Contrats définitifs — `document_type` + remapping vs duplication
**Date :** 2026-04-15
**Contexte :** Le Contract Engine doit générer 24 contrats définitifs (C1-C8) en plus des 24 promesses (P1-P8). Les deux documents partagent ~30 articles identiques mais le contrat retire 9 articles, en remplace 3, et en ajoute 7 (RGPD, législation sociale, imprévision, non-renonciation, droit applicable fusionné, deux annexes mandat).
**Decision :** Stocker chaque article partagé une seule fois en DB avec `document_type = "all"`. Les articles structurellement différents (en-tête prestataire, objet, nullité) sont dupliqués en deux entrées distinctes (`promesse_only` + `contrat_only`). Les renvois internes utilisant la numérotation promesse (`paragraphe 2.2.1`, etc.) sont transformés à la volée par un find-and-replace appliqué uniquement aux articles `all` lors de la génération d'un contrat. La constante `CONTRAT_TEXT_REMAPPING` (`src/config/contrat-remapping.ts`) tient les paires de transformation, ordonnées du plus spécifique au plus général. `PROTECTED_REFERENCES` liste les renvois Code civil/CGI qui ne doivent jamais être transformés.
**Alternatives considerees :**
- Dupliquer les ~30 articles partagés (deux versions promesse/contrat) -> écarté car cascade les erreurs : toute mise à jour devrait être faite deux fois, doublant la surface des bugs et du contenu à maintenir
- Stocker la version contrat dans des colonnes `content_*_contrat` séparées sur l'article unique -> écarté car explose le schéma (5 axes × 2 documents = 10 colonnes par variante) et complique le rendu
- Templates Mustache/Handlebars avec variables -> écarté car le contrat n'est pas une variation paramétrique de la promesse, c'est une refonte structurelle (articles supprimés, fusionnés, réordonnés)
**Consequences :**
- Le `contract-assembler` (Phase 2) doit filtrer les articles selon `document_type` du contrat cible : `promesse` → `all` + `promesse_only`, `contrat` → `all` + `contrat_only`
- Les articles `contrat_only` qui REMPLACENT un `promesse_only` partagent le même `order_index` (collision tolérée car le filtre les sépare)
- Le remapping est purement textuel — pas de parsing de la structure d'article. Risque résiduel : si un nouveau renvoi interne apparaît dans un article `all` après une refonte de la numérotation, il faudra mettre à jour la table de remapping
- 12 articles taggés `promesse_only`, 12 `contrat_only`, 29 `all` (total 53 articles après Phase 1)

---

> Ajouter une nouvelle entree a chaque decision structurante.

> **Derniere mise a jour :** 2026-04-15
