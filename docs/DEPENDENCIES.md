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
- **Utilisé par :** [À REMPLIR — tous les fichiers qui font des requêtes DB]
- **Dépend de :** `prisma/schema.prisma`
- **⚠️ Impact :** Fichier fondation. Ne JAMAIS modifier sans validation Loïc.

### `src/lib/contract-assembler.ts`
- **Exporte :** [À REMPLIR]
- **Utilisé par :** [À REMPLIR]
- **Dépend de :** [À REMPLIR]
- **⚠️ Impact :** Logique métier critique — si un article est mal assemblé, le contrat signé sera faux.

### `src/lib/docx-generator.ts`
- **Exporte :** [À REMPLIR]
- **Utilisé par :** [À REMPLIR]
- **Dépend de :** [À REMPLIR]
- **⚠️ Impact :** Mise en page des contrats. Toute modification doit être vérifiée visuellement sur les 18 variantes.

### `src/config/contracts.ts`
- **Exporte :** [À REMPLIR — mapping des 18 variantes, PowerForm IDs, etc.]
- **Utilisé par :** [À REMPLIR]
- **Dépend de :** rien
- **⚠️ Impact :** Source de vérité pour le mapping des 18 variantes. Erreur ici = mauvais contrat envoyé à DocuSign.

---

## Lib

### `src/lib/auth.ts`
- **Exporte :** [À REMPLIR]
- **Utilisé par :** [À REMPLIR]
- **Dépend de :** [À REMPLIR]

### `src/lib/google-drive.ts`
- **Exporte :** [À REMPLIR]
- **Utilisé par :** [À REMPLIR]
- **Dépend de :** [À REMPLIR]

### `src/lib/docusign.ts`
- **Exporte :** [À REMPLIR]
- **Utilisé par :** [À REMPLIR]
- **Dépend de :** [À REMPLIR]

---

## Config

### `src/config/styles.ts`
- **Exporte :** [À REMPLIR — styles DOCX]
- **Utilisé par :** [À REMPLIR]
- **Dépend de :** rien

---

## Composants

### `src/components/ArticleEditor.tsx`
- **Exporte :** [À REMPLIR]
- **Utilisé par :** [À REMPLIR]
- **Dépend de :** [À REMPLIR]

### `src/components/VariantTabs.tsx`
- **Exporte :** [À REMPLIR]
- **Utilisé par :** [À REMPLIR]
- **Dépend de :** [À REMPLIR]

### `src/components/ContractList.tsx`
- **Exporte :** [À REMPLIR]
- **Utilisé par :** [À REMPLIR]
- **Dépend de :** [À REMPLIR]

### `src/components/PreviewPanel.tsx`
- **Exporte :** [À REMPLIR]
- **Utilisé par :** [À REMPLIR]
- **Dépend de :** [À REMPLIR]

### `src/components/StepIndicator.tsx`
- **Exporte :** [À REMPLIR]
- **Utilisé par :** [À REMPLIR]
- **Dépend de :** [À REMPLIR]

---

## Types

### `src/types/index.ts`
- **Exporte :** [À REMPLIR]
- **Utilisé par :** [À REMPLIR]
- **Dépend de :** rien

---

## Routes API

### `src/app/api/articles/route.ts`
- **Exporte :** `GET`, `PUT`
- **Utilisé par :** frontend via fetch
- **Dépend de :** [À REMPLIR]

### `src/app/api/generate/route.ts`
- **Exporte :** `POST`
- **Utilisé par :** frontend via fetch
- **Dépend de :** [À REMPLIR]

### `src/app/api/push-docusign/route.ts`
- **Exporte :** `POST`
- **Utilisé par :** frontend via fetch
- **Dépend de :** [À REMPLIR]

### `src/app/api/versions/route.ts`
- **Exporte :** `GET`
- **Utilisé par :** frontend via fetch
- **Dépend de :** [À REMPLIR]

### `src/app/api/contracts/route.ts`
- **Exporte :** `GET`
- **Utilisé par :** frontend via fetch
- **Dépend de :** [À REMPLIR]

---

## Fichiers de config (ne pas toucher sans raison)

| Fichier | Rôle | Toucher = danger ? |
|---------|------|---------------------|
| `next.config.js` | Config Next.js | ⚠️ Oui |
| `tailwind.config.ts` | Config Tailwind | Modéré |
| `tsconfig.json` | Config TypeScript | ⚠️ Oui |
| `prisma/schema.prisma` | Schéma DB | ⚠️ Oui — toute modif = nouvelle migration |
| `.env.local` | Variables d'env locales | ⚠️ Oui |
| `railway.json` | Config déploiement | ⚠️ Oui |

---

> **Dernière mise à jour :** 2026-04-07
> **Mis à jour par :** [L'agent codeur remplit ce fichier après l'init technique]
