# Conventions — Contract Engine

## Code

**Langue du code :** anglais (variables, fonctions, commentaires)
**Langue des commits :** français
**Langue de la documentation :** français

### TypeScript / Next.js

- Typage strict : pas de `any`, pas de `as` sauf cas documenté dans DECISIONS.md
- Composants : un fichier = un composant exporté par défaut
- Imports : absolus avec `@/` (pas de `../../../`)
- Pas de `console.log` en production — utiliser un logger structuré
- Pas de `// TODO` sans issue GitHub associée
- ORM : Prisma uniquement, pas de requêtes SQL raw sauf cas documenté

### Nommage

- Fichiers composants : `PascalCase.tsx`
- Fichiers utilitaires : `camelCase.ts`
- Variables d'env : `UPPER_SNAKE_CASE`
- Tables DB : `snake_case` (mapping Prisma avec `@@map`)
- Routes API : `kebab-case`

## Git

### Branches

Branche de travail : tout se fait sur `dev`, jamais sur `main` directement.
Si la tâche est complexe ou risquée : créer `feature/nom-court` depuis `dev`.

### Commits

Un commit après chaque changement fonctionnel. C'est AUTOMATIQUE, pas sur demande.
Format : `type: description courte en français`
Types autorisés : `feat`, `fix`, `refactor`, `docs`, `test`, `chore`
Un commit = une seule intention. Jamais de code cassé committé.

### Flow de livraison (CHAQUE modification)

1. Coder sur `dev` ou `feature/xxx`
2. Lancer les tests : `npm test` — si échec, corriger et relancer
3. Mettre à jour `docs/DEPENDENCIES.md` si tu as modifié des imports ou des relations entre fichiers
4. Mettre à jour la documentation concernée (`API.md`, `DATA-MODEL.md`, etc.)
5. Commit au format `type: description`
6. Push la branche
7. Créer une PR vers `dev` (si feature branch) ou informer Loïc (si directement sur dev)
8. Poster la checklist de livraison (voir ci-dessous)
9. **JAMAIS de merge sans accord explicite de Loïc**

### Checklist de livraison

Poster ceci dans le canal de communication AVANT de dire "c'est fait" :

```
☐ Branche : [nom de la branche]
☐ Commits format feat/fix/refactor: description
☐ Tests passent (npm test)
☐ docs/DEPENDENCIES.md à jour
☐ docs/ à jour (quels fichiers modifiés : ...)
☐ PR créée — lien : [URL]
☐ Preview : [URL Railway]
☐ En attente validation Loïc — pas de merge auto
```

### Preview Railway

Après chaque push, communiquer l'URL preview dans ce format :
🔗 Preview : [URL]
Une tâche n'est JAMAIS terminée sans que Loïc ait vu et validé la preview.

## Dépendances externes

Ne JAMAIS ajouter une dépendance npm sans demander à Loïc.
Avant d'utiliser un package, vérifier :
- Est-il déjà dans le projet ? (`package.json`)
- Peut-on faire sans ? (vanilla JS/TS ou lib existante)
- Dernier commit sur le repo < 6 mois ?
- Plus de 1000 stars GitHub ?

**Dépendances clés autorisées :**
- `docx` (npm) — génération DOCX
- `prisma` + `@prisma/client` — ORM
- `googleapis` — Google Drive API
- `docusign-esign` — DocuSign API

## Erreur handling

- API routes : toujours retourner un JSON structuré `{ success, data, error }`
- Jamais de `catch` vide — logger l'erreur
- Erreurs utilisateur : messages en français, clairs
- Erreurs système : logger les détails techniques, afficher un message générique à l'utilisateur
- Erreurs DocuSign / Google Drive : toujours logger le code HTTP + le body de réponse pour debug
