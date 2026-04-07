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
- **Utilisé par :** toutes les routes API (articles, contracts, generate, push-docusign, versions)
- **Dépend de :** `pg`, `@prisma/adapter-pg`, `@/generated/prisma` (généré depuis `prisma/schema.prisma`)
- **⚠️ Impact :** Fichier fondation. Ne JAMAIS modifier sans validation Loïc.

### `src/lib/contract-assembler.ts`
- **Exporte :** [placeholder — pas encore implémenté]
- **Utilisé par :** `src/app/api/generate/route.ts`
- **Dépend de :** `src/lib/db.ts`, `src/config/contracts.ts`
- **⚠️ Impact :** Logique métier critique — si un article est mal assemblé, le contrat signé sera faux.

### `src/lib/docx-generator.ts`
- **Exporte :** [placeholder — pas encore implémenté]
- **Utilisé par :** `src/app/api/generate/route.ts`
- **Dépend de :** `src/config/styles.ts`, `docx` (npm)
- **⚠️ Impact :** Mise en page des contrats. Toute modification doit être vérifiée visuellement sur les 18 variantes.

### `src/config/contracts.ts`
- **Exporte :** `ContractVariant` (type), `CONTRACT_VARIANTS` (tableau des 18 variantes)
- **Utilisé par :** `prisma/seed.ts`, `src/lib/contract-assembler.ts`
- **Dépend de :** rien
- **⚠️ Impact :** Source de vérité pour le mapping des 18 variantes. Erreur ici = mauvais contrat envoyé à DocuSign.

---

## Lib

### `src/lib/auth.ts`
- **Exporte :** `authenticate(request: NextRequest): NextResponse | null` — retourne null si OK, NextResponse 401 si échec
- **Utilisé par :** `src/app/api/articles/route.ts`, `src/app/api/articles/[id]/route.ts`, toutes les routes API
- **Dépend de :** `next/server` (NextRequest, NextResponse), `process.env.APP_SECRET`

### `src/lib/google-drive.ts`
- **Exporte :** [placeholder — pas encore implémenté]
- **Utilisé par :** `src/app/api/generate/route.ts`, `src/app/api/push-docusign/route.ts`
- **Dépend de :** `googleapis` (npm)

### `src/lib/docusign.ts`
- **Exporte :** [placeholder — pas encore implémenté]
- **Utilisé par :** `src/app/api/push-docusign/route.ts`
- **Dépend de :** `docusign-esign` (npm)

---

## Config

### `src/config/styles.ts`
- **Exporte :** [placeholder — pas encore implémenté]
- **Utilisé par :** `src/lib/docx-generator.ts`
- **Dépend de :** rien

---

## Composants

### `src/components/ArticleEditor.tsx`
- **Exporte :** `ArticleEditor` (composant accordéon : titre cliquable, textarea, bouton Enregistrer, feedback sauvegarde)
- **Utilisé par :** `src/app/editor/page.tsx`
- **Dépend de :** `react` (useState), `src/types/index.ts`, `src/components/VariantTabs.tsx`

### `src/components/VariantTabs.tsx`
- **Exporte :** `VariantTabs` (onglets dynamiques selon scope : common=textarea seul, commission=3 onglets, statut=2 onglets, menage=3 onglets)
- **Utilisé par :** `src/components/ArticleEditor.tsx`
- **Dépend de :** `react` (useState), `src/types/index.ts`

### `src/components/ContractList.tsx`
- **Exporte :** [placeholder — pas encore implémenté]
- **Utilisé par :** `src/app/generate/page.tsx`, `src/app/push/page.tsx`
- **Dépend de :** `src/types/index.ts`

### `src/components/PreviewPanel.tsx`
- **Exporte :** [placeholder — pas encore implémenté]
- **Utilisé par :** `src/app/generate/page.tsx`
- **Dépend de :** `src/types/index.ts`

### `src/components/StepIndicator.tsx`
- **Exporte :** `StepIndicator` (barre 3 étapes : Modifier/Générer/Pousser, prop `currentStep`)
- **Utilisé par :** `src/app/editor/page.tsx`
- **Dépend de :** rien

---

## Types

### `src/types/index.ts`
- **Exporte :** `Article` (interface), `ApiResponse<T>` (interface générique)
- **Utilisé par :** `src/components/ArticleEditor.tsx`, `src/components/VariantTabs.tsx`, `src/app/editor/page.tsx`
- **Dépend de :** rien

---

## Routes API

### `src/app/api/articles/route.ts`
- **Exporte :** `GET` (liste articles triés par order_index)
- **Utilisé par :** `src/app/editor/page.tsx` via fetch
- **Dépend de :** `src/lib/db.ts`, `src/lib/auth.ts`

### `src/app/api/articles/[id]/route.ts`
- **Exporte :** `GET` (un article par ID), `PUT` (mise à jour partielle)
- **Utilisé par :** `src/components/ArticleEditor.tsx` via fetch
- **Dépend de :** `src/lib/db.ts`, `src/lib/auth.ts`

### `src/app/api/generate/route.ts`
- **Exporte :** `POST`
- **Utilisé par :** frontend via fetch
- **Dépend de :** `src/lib/db.ts`, `src/lib/auth.ts`, `src/lib/contract-assembler.ts`, `src/lib/docx-generator.ts`, `src/lib/google-drive.ts`

### `src/app/api/push-docusign/route.ts`
- **Exporte :** `POST`
- **Utilisé par :** frontend via fetch
- **Dépend de :** `src/lib/db.ts`, `src/lib/auth.ts`, `src/lib/google-drive.ts`, `src/lib/docusign.ts`

### `src/app/api/versions/route.ts`
- **Exporte :** `GET`
- **Utilisé par :** frontend via fetch
- **Dépend de :** `src/lib/db.ts`, `src/lib/auth.ts`

### `src/app/api/contracts/route.ts`
- **Exporte :** `GET`
- **Utilisé par :** frontend via fetch
- **Dépend de :** `src/lib/db.ts`, `src/lib/auth.ts`

---

## Pages

### `src/app/page.tsx`
- **Exporte :** `Home` (redirect vers /editor)
- **Utilisé par :** Next.js routing
- **Dépend de :** `next/navigation`

### `src/app/editor/page.tsx`
- **Exporte :** `EditorPage` (client component — login token + liste articles en accordéon)
- **Utilisé par :** Next.js routing
- **Dépend de :** `react` (useState, useEffect), `src/types/index.ts`, `src/components/StepIndicator.tsx`, `src/components/ArticleEditor.tsx`

### `src/app/generate/page.tsx`
- **Exporte :** `GeneratePage`
- **Utilisé par :** Next.js routing
- **Dépend de :** [placeholder]

### `src/app/push/page.tsx`
- **Exporte :** `PushPage`
- **Utilisé par :** Next.js routing
- **Dépend de :** [placeholder]

### `src/app/history/page.tsx`
- **Exporte :** `HistoryPage`
- **Utilisé par :** Next.js routing
- **Dépend de :** [placeholder]

---

## Scripts

### `prisma/seed.ts`
- **Exporte :** rien (script standalone)
- **Utilisé par :** `npx prisma db seed`
- **Dépend de :** `dotenv`, `pg`, `@prisma/adapter-pg`, `src/generated/prisma/client`

---

## Fichiers de config (ne pas toucher sans raison)

| Fichier | Rôle | Toucher = danger ? |
|---------|------|---------------------|
| `next.config.mjs` | Config Next.js | ⚠️ Oui |
| `tailwind.config.ts` | Config Tailwind | Modéré |
| `tsconfig.json` | Config TypeScript | ⚠️ Oui |
| `prisma/schema.prisma` | Schéma DB | ⚠️ Oui — toute modif = nouvelle migration |
| `prisma.config.ts` | Config Prisma 7 (datasource URL, seed) | ⚠️ Oui |
| `.env.local` | Variables d'env locales | ⚠️ Oui |

---

> **Dernière mise à jour :** 2026-04-07
> **Mis à jour par :** Claude Code (feat: éditeur d'articles)
