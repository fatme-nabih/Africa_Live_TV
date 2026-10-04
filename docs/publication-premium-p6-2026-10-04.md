# Publication Premium P6 « Performance mobile » — 4 octobre 2026

Le propriétaire a explicitement demandé : commit, publication sur staging, puis mesure Lighthouse sur staging.

## Périmètre

- Lot P6 (UX-601 → UX-606) : commit applicatif
  [`7e27319`](https://github.com/fatme-nabih/Africa_Live_TV/commit/7e27319) (39 fichiers), puis commit documentaire
  [`c710769`](https://github.com/fatme-nabih/Africa_Live_TV/commit/c710769). Détail : section « Lot P6 » de
  [production-progress.md](production-progress.md) ; mesures : [audit, section P6](audit-a11y-performance-2026-10-03.md).
- GitHub : `fatme-nabih/Africa_Live_TV`, `main`. Railway : `just-compassion`, service `Africa_Live_TV`, rôle **staging**. Pas de promotion
  en production. Aucune variable, DNS, plan ou configuration Clerk modifiés.

## Contrôles avant publication

- `origin/main` = `f260400` (synchronisé) ; recherche de secrets sur les 61 fichiers modifiés : aucun ; aucun fichier privé.
- Aucun changement de schéma ni de dépendance (`drizzle/`, `src/db`, `package.json`, `package-lock.json` inchangés) : pas de
  sauvegarde requise, pré-déploiement `db:migrate:deploy` sans effet.
- Code : tsc 0, lint 0, 360 tests (346/14/0), invariants 4/4, build ; E2E MVP 141 + 1 ignoré, 5 échecs corrigés et specs rejoués
  (25/25, 11/11) ; E2E Clerk 8/8.

## Livraison et réception

- Push `f260400..c710769`, confirmé par `git ls-remote`.
- Paquet CLI extrait du commit `c710769` : 514 fichiers (sans captures ni fixtures), 409 applicatifs ; empreinte du manifeste
  `6b4e906818d8d999c596ee3ea0c584ec06dd93632d9dc46dafb01b1dd9af8413`.
- Railway : **`e077db96-4d69-41da-b431-1b3d3f8cdd8d` SUCCESS** ; le déploiement précédent `3bc79b16` est remplacé.
- Preuve SHA-256 par SSH (lots de 30) : **409/409 fichiers identiques**, 0 différence ; rôle `staging`, Node en production.
- Santé 200 (processus et base `ok`) sur `staging.africatv.sn` et le domaine Railway ; météo anonyme 401 ; dashboard 307.
- Pages publiques servies depuis le cache Next (`x-nextjs-cache: HIT`) **sans redirection Clerk** : `/` (`s-maxage=600`), `/pricing`,
  `/cgu`. `/sign-in` garde la poignée de main de l'instance Clerk de développement (307 vers `clerk.accounts.dev`), comme prévu.
- **9/9 E2E distants** (28 s) : landing, widgets Clerk, accès anonymes protégés, paiement simulé sans transaction, build servi.
- Chiffres de la landing : absents juste après le build (base injoignable pendant le build Railway, comportement prévu et documenté),
  revenus à la première régénération, environ 10 minutes après le build (11 771 chaînes, 371 africaines, 36 pays).

## Lighthouse sur staging après publication

Mobile : 3 passages, médiane (mesure de la landing faite après le retour des chiffres). Desktop : 1 passage.

| Page | Mobile avant (`865c85d`) | **Mobile après** | LCP mobile | Desktop avant | **Desktop après** | Accessibilité | Bonnes pratiques |
|---|---|---|---|---|---|---|---|
| Landing | 69 | **93** (93/94/92) | 2,98 s | 88 | **99** | 100 | **100** (79 avant) |
| `/pricing` | 64 | **75** (70/75/75) | 5,25 s | 85 | **95** | 100 | 79 |
| `/sign-in` | 64 | **73** (75/73/72) | 4,46 s | 85 | **93** | 100 | 79 |
| `/cgu` | — | **97** | 2,53 s | — | **99** | 100 | 100 |

- Objectif ≥ 90 en mobile **atteint sur la landing (93) et les CGU (97)**. `/pricing` et `/sign-in` restent sous 90 : 342 Ko de scripts
  Clerk sur 4G lente, et pour `/sign-in` la poignée de main de l'instance de développement. Plus aucune redirection sur `/pricing`.
- Bonnes pratiques 79 sur les pages qui chargent Clerk : cookies tiers de l'instance de développement (D-2).

## Limites

Profils Clerk connectés sur staging (landing d'un membre), paiement réel, appareils Android et VLC réel : hors réception. Preuves
locales : `.local-logs/publication-p6/` et `.local-logs/p6/after-staging*` (ignorés par Git).
