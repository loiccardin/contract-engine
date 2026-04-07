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
